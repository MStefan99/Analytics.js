import { Context, Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';
import { hasBody } from './middleware.ts';
import { initApp } from '../lib/init.ts';
import analyzer from '../lib/analyzer.ts';
import rateLimiter from '../lib/rateLimiter.ts';

const sessionLength = 1000 * 60 * 30;
const dayLength = 1000 * 60 * 60 * 24;
const defaultSessionLength = 1000 * 60 * 30;
const defaultRealtimeLength = 1000 * 60 * 31; // 0 through 30 minutes ago
const defaultHistoryLength = dayLength * 31; // 0 through 30 days ago

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

		const params = new URLSearchParams(ctx.request.url.search);

		const period = params.has('period')
			? +(params?.get('period') as string) // Safe because of the check
			: defaultRealtimeLength;

		app && (ctx.response.body = await analyzer.overview(app.id, period));
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

		const params = new URLSearchParams(ctx.request.url.search);

		const period = params.has('period')
			? +(params?.get('period') as string) // Safe because of the check
			: defaultRealtimeLength;

		app &&
			(ctx.response.body = await analyzer.realtimeAudience(
				app.id,
				period,
			));
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

		app &&
			(ctx.response.body = await analyzer.todayAudience(
				app.id,
				defaultSessionLength,
			));
	},
);

router.get(
	'/:id/audience/aggregate',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		app &&
			(ctx.response.body = await analyzer.audienceAggregate(
				app.id,
				startTime,
				endTime,
			));
	},
);

router.get(
	'/:id/pages/aggregate',
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

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		ctx.response.body = await app.getPageAggregate(startTime, endTime);
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

		const level = params.has('level')
			? +(params.get('level') as string)
			: 0; // Safe because of the check

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		ctx.response.body = await app.getServerLogs(startTime, endTime, level);
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

		const level = params.has('level')
			? +(params.get('level') as string)
			: 0; // Safe because of the check

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		ctx.response.body = await app.getClientLogs(startTime, endTime, level);
	},
);

router.get(
	'/:id/logs/server/aggregate',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		app &&
			(ctx.response.body = await analyzer.logAggregate(
				app.id,
				'server',
				startTime,
				endTime,
			));
	},
);

router.get(
	'/:id/logs/client/aggregate',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id);

		const now = Date.now();
		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		app &&
			(ctx.response.body = await analyzer.logAggregate(
				app.id,
				'client',
				startTime,
				endTime,
			));
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

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - defaultHistoryLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		ctx.response.body = await app.getFeedback(startTime, endTime);
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

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: now - sessionLength;
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: now;

		ctx.response.body = await app.getMetrics(startTime, endTime);
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
