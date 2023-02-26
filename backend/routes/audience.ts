import { encode as hexEncode, Router } from '../deps.ts';
import auth from '../lib/auth.ts';
import openDB from '../lib/db.ts';
import { hasBody } from './middleware.ts';

function getRandomString(byteCount: number): string {
	const dec = new TextDecoder();
	const data = crypto.getRandomValues(new Uint8Array(byteCount));

	return dec.decode(hexEncode(data));
}

const router = new Router({
	prefix: '/audience',
});

router.post('/hits', hasBody(), auth.hasAudienceKey(), async (ctx) => {
	const app = await auth.methods.getAppByAudienceKey(ctx);

	if (!app) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'APP_NOT_FOUND',
			message: 'App was not found',
		};
		return;
	}

	const body = await ctx.request.body({ type: 'json' }).value;
	const db = await openDB(app.id);

	const sessionID = body.ccs ? body.ccs : getRandomString(16);

	if (body.ccs) {
		if (
			!(await db.query(
				`select id as sessionID
                          from sessions
                          where id = ?`,
				[sessionID],
			)).length
		) {
			body.ccs = null;
		}
	}

	if (!body.ccs) {
		await db.query(
			`insert into sessions(id, ip, ua, lang)
       values (?, ?, ?, ?)`,
			[
				sessionID,
				ctx.request.ip,
				ctx.request.headers.get('user-agent') ?? null,
				ctx.request.headers.get('accept-language') ?? null,
			],
		);
	}

	if (!body.url) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_URL',
			message: 'You must provide a URL to record a hit to',
		};
		return;
	}

	await db.query(
		`insert into hits(session_id, url, referrer, time)
     values (?, ?, ?, ?)`,
		[
			sessionID,
			body.url,
			body.referrer,
			Date.now(),
		],
	);

	ctx.response.status = 201;
	ctx.response.body = {
		session: sessionID,
	};
});

router.post('/logs', hasBody(), auth.hasAudienceKey(), async (ctx) => {
	const app = await auth.methods.getAppByAudienceKey(ctx);

	if (!app) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'APP_NOT_FOUND',
			message: 'App was not found',
		};
		return;
	}

	const body = await ctx.request.body({ type: 'json' }).value;
	if (!body.message || !body.level) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_MESSAGE_OR_LEVEL',
			message: 'You need to provide both message and level',
		};
		return;
	}

	const db = await openDB(app.id);
	db.query(
		`insert into client_logs(time, tag, message, level)
     VALUES (?, ?, ?, ?)`,
		[Date.now(), body.tag, body.message, body.level],
	);

	ctx.response.status = 201;
});

router.post('/feedback', hasBody(), auth.hasAudienceKey(), async (ctx) => {
	const app = await auth.methods.getAppByAudienceKey(ctx);

	if (!app) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'APP_NOT_FOUND',
			message: 'App was not found',
		};
		return;
	}

	const body = await ctx.request.body({ type: 'json' }).value;
	if (!body.message) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_MESSAGE',
			message: 'You need to provide a message',
		};
		return;
	}

	const db = await openDB(app.id);
	db.query(`insert into feedback(time, message) values(?, ?)`, [
		Date.now(),
		body.message,
	]);

	ctx.response.status = 201;
});

export default router;
