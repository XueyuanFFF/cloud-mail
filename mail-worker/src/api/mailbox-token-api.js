import app from '../hono/hono';
import result from '../model/result';
import mailboxTokenService from '../service/mailbox-token-service';

function normalizeEmail(body) {
	return (body?.email || '').trim().toLowerCase();
}

app.post('/code/latest', async (c) => {
	const body = await c.req.json();
	const token = (body?.token || '').trim();

	if (!token) {
		return c.json(result.fail('token不能为空', 400));
	}

	const data = await mailboxTokenService.getLatestCode(c, token);

	if (!data) {
		return c.json(result.fail('最近10分钟内未找到验证码邮件', 404));
	}

	return c.json(result.ok(data));
});

app.post('/mailboxToken/current', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.getCurrentToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/generate', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.generateToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/rotate', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.rotateToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/disable', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.disableToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/enable', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.enableToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/recent', async (c) => {
	const body = await c.req.json();
	const token = (body?.token || '').trim();

	if (!token) {
		return c.json(result.fail('token不能为空', 400));
	}

	const data = await mailboxTokenService.getRecentMails(c, token);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/ban', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.banToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/unban', async (c) => {
	const body = await c.req.json();
	const emailAddr = normalizeEmail(body);

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.unbanToken(c, emailAddr);
	return c.json(result.ok(data));
});
