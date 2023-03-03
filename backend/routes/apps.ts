import { Context, Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';
import { hasBody } from './middleware.ts';
import { initApp } from '../lib/init.ts';
import analyzer from '../lib/analyzer.ts';

const dayLength = 1000 * 60 * 60 * 24;

const router = new Router({
	prefix: '/apps',
});

async function getApp(ctx: Context, id: number): Promise<App | undefined> {
	const user = await auth.methods.getUser(ctx);
	if (user === null) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
		return;
	}

	if (Number.isNaN(id)) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'ID_NAN',
			message: 'App ID must be a number',
		};
		return;
	}

	const app = await App.getByID(id);
	if (!app || app.ownerID !== user.id) {
		ctx.response.status = 404;
		ctx.response.body = {
			error: 'APP_NOT_FOUND',
			message: 'App was not found',
		};
		return;
	}

	return app;
}

router.get('/', auth.authenticated(), async (ctx) => {
	const user = await auth.methods.getUser(ctx);

	if (user === null) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
		return;
	}

	ctx.response.body = await App.getByUser(user);
});

router.post('/', hasBody(), auth.authenticated(), async (ctx) => {
	const user = await auth.methods.getUser(ctx);

	if (user === null) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
		return;
	}

	const body = await ctx.request.body({ type: 'json' }).value;
	if (!body.name) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_NAME',
			message: 'App name needs to be provided',
		};
	}

	const app = await App.create(user, body.name.toString().trim());
	await initApp(app.id);

	ctx.response.status = 201;
	ctx.response.body = app;
});

router.get('/:id', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);

	app && (ctx.response.body = app);
});

router.patch('/:id', hasBody(), auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);

	if (app) {
		const body = await ctx.request.body({ type: 'json' }).value;

		if (body.name) {
			app.name = body.name.toString().trim();
		}

		if (body.description) {
			app.description = body.description.toString().trim();
		}

		app.save();
		ctx.response.body = app;
	}
});

router.get('/:id/overview', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);

	app && (ctx.response.body = await analyzer.metricsOverview(app.id));
});

router.get('/:id/now', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);

	app && (ctx.response.body = await analyzer.realtimeAudience(app.id));
});

router.get('/:id/today', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);

	app && (ctx.response.body = await analyzer.dayAudience(app.id));
});

router.get('/:id/logs/server', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);
	if (!app) {
		return;
	}

	const now = Date.now();
	const params = new URLSearchParams(ctx.request.url.search);

	const startTime = params.has('startTime')
		? +(params?.get('startTime') as string)
		: now - dayLength;
	const level = params.has('level') ? +(params.get('level') as string) : 0;

	ctx.response.body = await app.getServerLogs(startTime, level);
});

router.get('/:id/logs/client', auth.authenticated(), async (ctx) => {
	const app = await getApp(ctx, +ctx.params.id);
	if (!app) {
		return;
	}

	const now = Date.now();
	const params = new URLSearchParams(ctx.request.url.search);

	const startTime = params.has('startTime')
		? +(params?.get('startTime') as string)
		: now - dayLength;
	const level = params.has('level') ? +(params.get('level') as string) : 0;

	ctx.response.body = await app.getClientLogs(startTime, level);
});

export default router;
