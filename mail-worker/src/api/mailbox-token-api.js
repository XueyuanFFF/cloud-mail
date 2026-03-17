import app from '../hono/hono';
import result from '../model/result';
import mailboxTokenService from '../service/mailbox-token-service';

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

app.post('/mailboxToken/recent', async (c) => {
	const body = await c.req.json();
	const token = (body?.token || '').trim();

	if (!token) {
		return c.json(result.fail('token不能为空', 400));
	}

	const data = await mailboxTokenService.getRecentMails(c, token);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/generate', async (c) => {
	const body = await c.req.json();
	const emailAddr = (body?.email || '').trim().toLowerCase();

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.generateToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/ban', async (c) => {
	const body = await c.req.json();
	const emailAddr = (body?.email || '').trim().toLowerCase();

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.banToken(c, emailAddr);
	return c.json(result.ok(data));
});

app.post('/mailboxToken/unban', async (c) => {
	const body = await c.req.json();
	const emailAddr = (body?.email || '').trim().toLowerCase();

	if (!emailAddr) {
		return c.json(result.fail('email不能为空', 400));
	}

	const data = await mailboxTokenService.unbanToken(c, emailAddr);
	return c.json(result.ok(data));
});
