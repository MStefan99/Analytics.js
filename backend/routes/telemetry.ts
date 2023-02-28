import { Router } from '../deps.ts';
import auth from '../lib/auth.ts';
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
	await app.createMetrics({
		device: body.device,
		cpu: body.cpu,
		memFree: body.memFree,
		memTotal: body.memTotal,
		netUp: body.netUp,
		netDown: body.netDown,
		diskFree: body.diskFree,
		diskTotal: body.diskTotal,
	});

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
	if (body.message === undefined || body.level === undefined) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_MESSAGE_OR_LEVEL',
			message: 'You need to provide both message and level',
		};
		return;
	}

	await app.createServerLog(body.message, body.level, body.tag);

	ctx.response.status = 201;
});

export default router;
