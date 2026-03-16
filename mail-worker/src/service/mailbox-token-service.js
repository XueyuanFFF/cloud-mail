import orm from '../entity/orm';
import email from '../entity/email';
import { eq, and, desc } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import KvConst from '../const/kv-const';
import reqUtils from '../utils/req-utils';

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

function extractCodeFromText(text) {
	if (!text) return null;
	const patterns = [
		/(?:验证码|校验码|动态码|確認碼)[^\d]{0,12}(\d{4,8})/i,
		/(?:verification\s*code|verify\s*code|otp|code)[^\d]{0,12}(\d{4,8})/i
	];
	for (const reg of patterns) {
		const match = text.match(reg);
		if (match && match[1]) return match[1];
	}
	const common = text.match(/\b\d{4,8}\b/);
	return common ? common[0] : null;
}

function isWithinMinutes(timeStr, minutes = 10) {
	if (!timeStr) return false;
	const mailTime = new Date(timeStr.replace(' ', 'T') + 'Z').getTime();
	const now = Date.now();
	return now - mailTime >= 0 && now - mailTime <= minutes * 60 * 1000;
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

	async getLatestCode(c, token) {
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
		if (limited) throw new BizError('请求过于频繁，请30秒后再试', 429);

		await c.env.kv.put(rateLimitKey, '1', { expirationTtl: 30 });

		const mails = await orm(c).select({
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
		).orderBy(desc(email.emailId)).limit(20);

		for (const mail of mails) {
			if (!isWithinMinutes(mail.createTime, 10)) continue;
			const merged = [mail.text || '', mail.subject || '', mail.content || ''].join('\n');
			const code = extractCodeFromText(merged);
			if (!code) continue;
			return {
				email: emailAddr,
				verifyCode: code,
				subject: mail.subject || '',
				sendEmail: mail.sendEmail || '',
				createTime: mail.createTime
			};
		}

		return null;
	}
};

export default mailboxTokenService;
