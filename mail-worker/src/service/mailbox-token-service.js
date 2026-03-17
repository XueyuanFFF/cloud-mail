import orm from '../entity/orm';
import email from '../entity/email';
import { eq, and, desc } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import KvConst from '../const/kv-const';
import reqUtils from '../utils/req-utils';
import {
	CODE_RATE_LIMIT_SECONDS,
	findLatestCodeMail,
	mapRecentMails,
} from './mailbox-token-utils';

async function deriveKey(secret) {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
	return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptEmail(emailAddr, secret) {
	const key = await deriveKey(secret);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(emailAddr);
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);
	return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function decryptToken(tokenHex, secret) {
	try {
		const bytes = tokenHex.match(/.{2}/g).map(h => parseInt(h, 16));
		const combined = new Uint8Array(bytes);
		const iv = combined.slice(0, 12);
		const ciphertext = combined.slice(12);
		const key = await deriveKey(secret);
		const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
		return new TextDecoder().decode(decrypted);
	} catch {
		return null;
	}
}

const mailboxTokenService = {

	async generateToken(c, emailAddr) {
		const token = await encryptEmail(emailAddr.toLowerCase(), c.env.jwt_secret);
		return { email: emailAddr, token };
	},

	async banToken(c, emailAddr) {
		await c.env.kv.put(KvConst.TOKEN_BAN + emailAddr.toLowerCase(), '1');
		return { email: emailAddr };
	},

	async unbanToken(c, emailAddr) {
		await c.env.kv.delete(KvConst.TOKEN_BAN + emailAddr.toLowerCase());
		return { email: emailAddr };
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

	async resolveAvailableEmail(c, token) {
		const ip = reqUtils.getIp(c);
		const ipBan = await c.env.kv.get(KvConst.CODE_IP_BAN + ip);
		if (ipBan) throw new BizError('请求过于频繁，请30分钟后再试', 429);

		const emailAddr = await decryptToken(token, c.env.jwt_secret);
		if (!emailAddr) {
			await this.incrementFailCount(c, ip);
			throw new BizError('token无效', 401);
		}

		await c.env.kv.delete(KvConst.CODE_IP_FAIL + ip);

		const emailBan = await c.env.kv.get(KvConst.TOKEN_BAN + emailAddr);
		if (emailBan) throw new BizError('该令牌已被禁用', 403);

		const rateLimitKey = KvConst.CODE_RATE_LIMIT + emailAddr;
		const limited = await c.env.kv.get(rateLimitKey);
		if (limited) throw new BizError(`请求过于频繁，请${CODE_RATE_LIMIT_SECONDS}秒后再试`, 429);

		await c.env.kv.put(rateLimitKey, '1', { expirationTtl: CODE_RATE_LIMIT_SECONDS });
		return emailAddr;
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
		const emailAddr = await this.resolveAvailableEmail(c, token);
		const mails = await this.listRecentMails(c, emailAddr, 20);
		const latestMail = findLatestCodeMail(mails);

		if (!latestMail) {
			return null;
		}

		return {
			email: emailAddr,
			verifyCode: latestMail.verifyCode,
			subject: latestMail.subject,
			sendEmail: latestMail.sendEmail,
			createTime: latestMail.createTime
		};
	},

	async getRecentMails(c, token) {
		const emailAddr = await this.resolveAvailableEmail(c, token);
		const mails = await this.listRecentMails(c, emailAddr, 3);

		return {
			email: emailAddr,
			mails: mapRecentMails(mails, 3)
		};
	}
};

export default mailboxTokenService;
