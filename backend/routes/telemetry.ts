import { Router } from '../deps.ts';
import auth from '../lib/auth.ts';
import openDB from '../lib/db.ts';
import { hasBody } from './middleware.ts';

const router = new Router({
	prefix: '/telemetry',
});

router.post('/metrics', hasBody(), auth.hasTelemetryKey(), async (ctx) => {
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
});

router.post('/logs', hasBody(), auth.hasTelemetryKey(), async (ctx) => {
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
		`insert into server_logs(time, tag, message, level)
     VALUES (?, ?, ?, ?)`,
		[Date.now(), body.tag, body.message, body.level],
	);

	ctx.response.status = 201;
});

export default router;
