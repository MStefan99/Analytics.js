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
	prefix: '/telemetry',
});

router.post('/hit', hasBody(), auth.hasAudienceKey(), async (ctx) => {
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

router.post('/metrics', auth.hasTelemetryKey(), async (ctx) => {
	const app = await auth.methods.getAppByTelemetryKey(ctx);

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

	db.query(
		`insert into metrics(time, device, cpu, mem_free, mem_total, net_up, net_down, disk_free, disk_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			Date.now(),
			body.device,
			body.cpu,
			body.memFree,
			body.memTotal,
			body.netUp,
			body.netDown,
			body.diskFree,
			body.diskTotal,
		],
	);

	ctx.response.status = 201;
	ctx.response.body = {
		message: body.message,
		level: body.level,
	};
});

router.post('/log', auth.hasTelemetryKey(), async (ctx) => {
	const app = await auth.methods.getAppByTelemetryKey(ctx);

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

	db.query(
		`insert into logs(time, message, level)
            VALUES (?, ?, ?)`,
		[Date.now(), body.message, body.level],
	);

	ctx.response.status = 201;
	ctx.response.body = {
		message: body.message,
		level: body.level,
	};
});

export default router;
