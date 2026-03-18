import orm from '../entity/orm';
import account from '../entity/account';
import email from '../entity/email';
import { and, desc, eq, sql } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import KvConst from '../const/kv-const';
import reqUtils from '../utils/req-utils';
import {
	buildTokenPayload,
	findLatestCodeMail,
	isAccountTokenActive,
	mapRecentMails,
	signTokenPayload,
	TOKEN_STATUS,
	verifyTokenPayload,
} from './mailbox-token-utils';

function normalizeEmail(emailAddr) {
	return String(emailAddr || '').trim().toLowerCase();
}

function getCurrentUser(c) {
	return c.get('user');
}

function isSuperAdmin(c) {
	return getCurrentUser(c)?.email === c.env.admin;
}

function canManageAccount(c, accountRow) {
	const user = getCurrentUser(c);

	if (!user) {
		return true;
	}

	if (isSuperAdmin(c)) {
		return true;
	}

	return Number(accountRow?.userId || 0) === Number(user?.userId || 0);
}

function getRotatedMeta(c) {
	const user = getCurrentUser(c);
	return {
		tokenRotatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
		tokenRotatedBy: user?.userId || 0,
	};
}

const mailboxTokenService = {

	async selectAccountByEmail(c, emailAddr) {
		const normalizedEmail = normalizeEmail(emailAddr);
		return orm(c).select().from(account).where(and(
			sql`${account.email} COLLATE NOCASE = ${normalizedEmail}`,
			eq(account.isDel, isDel.NORMAL)
		)).get();
	},

	async selectAccountById(c, accountId) {
		return orm(c).select().from(account).where(and(
			eq(account.accountId, Number(accountId)),
			eq(account.isDel, isDel.NORMAL)
		)).get();
	},

	assertManagedAccount(c, accountRow, message = '无权操作该账号令牌') {
		if (!canManageAccount(c, accountRow)) {
			throw new BizError(message, 403);
		}
	},

	async selectManagedAccount(c, emailAddr) {
		const accountRow = await this.selectAccountByEmail(c, emailAddr);

		if (!accountRow) {
			throw new BizError('账号不存在', 404);
		}

		this.assertManagedAccount(c, accountRow);

		return accountRow;
	},

	async persistTokenState(c, accountId, data) {
		await orm(c).update(account).set(data).where(eq(account.accountId, accountId)).run();
		return this.selectAccountById(c, accountId);
	},

	async buildTokenResult(c, accountRow) {
		const token = await signTokenPayload(buildTokenPayload(accountRow), c.env.jwt_secret);
		return {
			accountId: accountRow.accountId,
			email: accountRow.email,
			token,
			tokenVersion: Number(accountRow.tokenVersion || 1),
			tokenStatus: Number(accountRow.tokenStatus ?? TOKEN_STATUS.ACTIVE),
			tokenRotatedAt: accountRow.tokenRotatedAt || '',
			tokenRotatedBy: accountRow.tokenRotatedBy || 0,
		};
	},

	async getCurrentToken(c, emailAddr) {
		const accountRow = await this.selectManagedAccount(c, emailAddr);
		return this.buildTokenResult(c, accountRow);
	},

	async generateToken(c, emailAddr) {
		return this.getCurrentToken(c, emailAddr);
	},

	async rotateToken(c, emailAddr) {
		const accountRow = await this.selectManagedAccount(c, emailAddr);
		const nextRow = await this.persistTokenState(c, accountRow.accountId, {
			tokenVersion: Number(accountRow.tokenVersion || 1) + 1,
			tokenStatus: TOKEN_STATUS.ACTIVE,
			...getRotatedMeta(c),
		});

		return this.buildTokenResult(c, nextRow);
	},

	async disableToken(c, emailAddr) {
		const accountRow = await this.selectManagedAccount(c, emailAddr);
		const nextRow = await this.persistTokenState(c, accountRow.accountId, {
			tokenStatus: TOKEN_STATUS.DISABLED,
			...getRotatedMeta(c),
		});

		return {
			accountId: nextRow.accountId,
			email: nextRow.email,
			tokenVersion: Number(nextRow.tokenVersion || 1),
			tokenStatus: Number(nextRow.tokenStatus ?? TOKEN_STATUS.DISABLED),
			tokenRotatedAt: nextRow.tokenRotatedAt || '',
			tokenRotatedBy: nextRow.tokenRotatedBy || 0,
		};
	},

	async enableToken(c, emailAddr) {
		const accountRow = await this.selectManagedAccount(c, emailAddr);
		const nextRow = await this.persistTokenState(c, accountRow.accountId, {
			tokenVersion: Number(accountRow.tokenVersion || 1) + 1,
			tokenStatus: TOKEN_STATUS.ACTIVE,
			...getRotatedMeta(c),
		});

		return this.buildTokenResult(c, nextRow);
	},

	async banToken(c, emailAddr) {
		return this.disableToken(c, emailAddr);
	},

	async unbanToken(c, emailAddr) {
		return this.enableToken(c, emailAddr);
	},

	async incrementFailCount(c, ip) {
		const failKey = KvConst.CODE_IP_FAIL + ip;
		const current = await c.env.kv.get(failKey);
		const count = current ? parseInt(current) + 1 : 1;
		if (count >= 4) {
			await c.env.kv.put(KvConst.CODE_IP_BAN + ip, '1', { expirationTtl: 1800 });
			await c.env.kv.delete(failKey);
		} else {
			await c.env.kv.put(failKey, String(count), { expirationTtl: 1800 });
		}
	},

	async resolveAvailableAccount(c, token) {
		const ip = reqUtils.getIp(c);
		const ipBan = await c.env.kv.get(KvConst.CODE_IP_BAN + ip);
		if (ipBan) throw new BizError('请求过于频繁，请30分钟后再试', 429);

		const payload = await verifyTokenPayload(token, c.env.jwt_secret);
		if (!payload?.accountId || !payload?.email || !payload?.version) {
			await this.incrementFailCount(c, ip);
			throw new BizError('token无效', 401);
		}

		const accountRow = await this.selectAccountById(c, payload.accountId);
		if (!accountRow || normalizeEmail(accountRow.email) !== normalizeEmail(payload.email)) {
			await this.incrementFailCount(c, ip);
			throw new BizError('token无效', 401);
		}

		await c.env.kv.delete(KvConst.CODE_IP_FAIL + ip);

		if (Number(accountRow.tokenStatus ?? TOKEN_STATUS.ACTIVE) === TOKEN_STATUS.DISABLED) {
			throw new BizError('该账号令牌已被禁用', 403);
		}

		if (!isAccountTokenActive(accountRow, payload)) {
			throw new BizError('令牌已失效，请联系管理员获取新令牌', 401);
		}

		return accountRow;
	},

	async listRecentMails(c, emailAddr, limit = 20) {
		return orm(c).select({
			emailId: email.emailId,
			subject: email.subject,
			text: email.text,
			content: email.content,
			sendEmail: email.sendEmail,
			createTime: email.createTime,
		}).from(email).where(
			and(
				eq(email.toEmail, emailAddr),
				eq(email.type, emailConst.type.RECEIVE),
				eq(email.isDel, isDel.NORMAL)
			)
		).orderBy(desc(email.emailId)).limit(limit);
	},

	async getLatestCode(c, token) {
		const accountRow = await this.resolveAvailableAccount(c, token);
		const mails = await this.listRecentMails(c, accountRow.email, 20);
		const latestMail = findLatestCodeMail(mails);

		if (!latestMail) {
			return null;
		}

		return {
			email: accountRow.email,
			verifyCode: latestMail.verifyCode,
			subject: latestMail.subject,
			sendEmail: latestMail.sendEmail,
			createTime: latestMail.createTime
		};
	},

	async getRecentMails(c, token) {
		const accountRow = await this.resolveAvailableAccount(c, token);
		this.assertManagedAccount(c, accountRow, '无权查询该账号邮件');
		const mails = await this.listRecentMails(c, accountRow.email, 3);

		return {
			email: accountRow.email,
			mails: mapRecentMails(mails, 3)
		};
	}
};

export default mailboxTokenService;
