import { Context, Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';
import { hasBody } from './middleware.ts';
import { initApp } from '../lib/init.ts';
import analyzer from '../lib/analyzer.ts';
import rateLimiter from '../lib/rateLimiter.ts';

const dayLength = 1000 * 60 * 60 * 24;
const sessionLength = 1000 * 60 * 30;

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

router.get(
	'/',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
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
	},
);

router.post(
	'/',
	hasBody(),
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
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
			return;
		}

		const app = await App.create(
			user,
			body.name.toString().trim(),
			body.description.toString().trim(),
		);
		await initApp(app.id);

		ctx.response.status = 201;
		ctx.response.body = app;
	},
);

router.get(
	'/:id',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app && (ctx.response.body = app);
	},
);

router.patch(
	'/:id',
	hasBody(),
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		if (!app) {
			return;
		}

		const body = await ctx.request.body({ type: 'json' }).value;
		if (body.name) {
			app.name = body.name.toString().trim();
		}

		if (body.description) {
			app.description = body.description.toString().trim();
		}

		app.save();
		ctx.response.body = app;
	},
);

router.get(
	'/:id/overview',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app && (ctx.response.body = await analyzer.overview(app.id));
	},
);

router.get(
	'/:id/audience/now',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app && (ctx.response.body = await analyzer.realtimeAudience(app.id));
	},
);

router.get(
	'/:id/audience/today',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app && (ctx.response.body = await analyzer.todayAudience(app.id));
	},
);

router.get(
	'/:id/audience/history',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app && (ctx.response.body = await analyzer.historyAudience(app.id));
	},
);

router.get(
	'/:id/logs/server',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);
		if (!app) {
			return;
		}

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('startTime')
			? +(params?.get('startTime') as string) // Safe because of the check
			: now - dayLength;
		const level = params.has('level')
			? +(params.get('level') as string)
			: 0; // Safe because of the check

		ctx.response.body = await app.getServerLogs(startTime, level);
	},
);

router.get(
	'/:id/logs/client',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);
		if (!app) {
			return;
		}

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('startTime')
			? +(params?.get('startTime') as string) // Safe because of the check
			: now - dayLength;
		const level = params.has('level')
			? +(params.get('level') as string)
			: 0; // Safe because of the check

		ctx.response.body = await app.getClientLogs(startTime, level);
	},
);

router.get(
	'/:id/logs/server/history',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app &&
			(ctx.response.body = await analyzer.historyLogs(app.id, 'server'));
	},
);

router.get(
	'/:id/logs/client/history',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		app &&
			(ctx.response.body = await analyzer.historyLogs(app.id, 'client'));
	},
);

router.get(
	'/:id/feedback',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);
		if (!app) {
			return;
		}

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('startTime')
			? +(params?.get('startTime') as string) // Safe because of the check
			: now - dayLength;

		ctx.response.body = await app.getFeedback(startTime);
	},
);

router.get(
	'/:id/metrics',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);
		if (!app) {
			return;
		}

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('startTime')
			? +(params?.get('startTime') as string) // Safe because of the check
			: now - sessionLength;

		ctx.response.body = await app.getMetrics(startTime);
	},
);

router.delete(
	'/:id',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		if (!app) {
			return;
		}

		app.delete();
		ctx.response.body = app;
	},
);

export default router;
