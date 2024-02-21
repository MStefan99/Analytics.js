import { Context, Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';
import { hasBody } from './middleware.ts';
import { initApp } from '../lib/init.ts';
import analyzer from '../lib/analyzer.ts';
import rateLimiter from '../lib/rateLimiter.ts';
import {
	encodePermissions,
	hasPermissions,
	parsePermissions,
	PERMISSIONS,
} from '../../common/permissions.ts';
import User from '../lib/user.ts';

const sessionLength = 1000 * 60 * 30;
const dayLength = 1000 * 60 * 60 * 24;
const defaultSessionLength = 1000 * 60 * 30;
const defaultRealtimeLength = 1000 * 60 * 31; // 0 through 30 minutes ago
const defaultHistoryLength = dayLength * 31; // 0 through 30 days ago

const viewPermissions = [
	PERMISSIONS.VIEW_AUDIENCE,
	PERMISSIONS.VIEW_SERVER_LOGS,
	PERMISSIONS.VIEW_CLIENT_LOGS,
	PERMISSIONS.VIEW_METRICS,
	PERMISSIONS.VIEW_FEEDBACK,
];

const router = new Router({
	prefix: '/apps',
});

async function getApp(
	ctx: Context,
	id: number,
	permissions?: number | PERMISSIONS[],
	any = false,
): Promise<App | undefined> {
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

	const app = await App.getByID(id, user);
	console.log(
		'permissions',
		permissions,
		parsePermissions(app?.permissions),
		hasPermissions(permissions ?? [], app?.permissions ?? [], any),
	);
	if (!app || !hasPermissions(permissions ?? [], app.permissions, any)) {
		ctx.response.status = 403;
		ctx.response.body = {
			error: 'NOT_AUTHORIZED',
			message: 'You are not allowed to do this',
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

		if (ctx.request.url.searchParams.has('audience')) {
			const start = new Date().setHours(0, 0, 0, 0) - dayLength * 7;
			ctx.response.body = await Promise.all(
				(await App.getByUser(
					user,
					encodePermissions(viewPermissions),
					true,
				))
					.map(async (app) => ({
						...app.toJSON(),
						...(hasPermissions(
							[PERMISSIONS.VIEW_AUDIENCE],
							app.permissions,
						) &&
							{
								audience: await analyzer.audienceAggregate(
									app,
									start,
								),
							}),
					})),
			);
		} else {
			ctx.response.body = await App.getByUser(
				user,
				encodePermissions(viewPermissions),
				true,
			);
		}
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
		const app = await getApp(ctx, +ctx.params.id, viewPermissions, true);

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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.EDIT_SETTINGS,
		]);

		if (!app) {
			return;
		}

		const body = await ctx.request.body({ type: 'json' }).value;
		if (body.name) {
			app.name = body.name.toString().trim();
		}

		if (body.description !== undefined) {
			app.description = body.description.toString().trim();
		}

		app.save();
		ctx.response.body = app;
	},
);

router.get(
	'/:id/permissions',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.EDIT_PERMISSIONS,
		]);

		if (!app) {
			return;
		}

		ctx.response.body = await app.getPermissions();
	},
);

router.put(
	'/:id/permissions/:username',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.EDIT_PERMISSIONS,
		]);

		if (!app) {
			return;
		}

		const user = await User.getByUsername(ctx.params.username);
		if (!user) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: 'USER_NOT_FOUND',
				message: 'User was not found',
			};
			return;
		}

		const body = await ctx.request.body({ type: 'json' }).value;
		const permissions = +body.permissions;
		if (isNaN(permissions) || permissions < 0) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: 'INVALID_PERMISSIONS',
				message: 'Permission values must be a positive number',
			};
			return;
		}

		await app.setPermissions(user, permissions);
		ctx.response.body = await app.getPermissions();
	},
);

router.delete(
	'/:id/permissions/:username',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.EDIT_PERMISSIONS,
		]);

		if (!app) {
			return;
		}

		const user = await User.getByUsername(ctx.params.username);
		if (!user) {
			ctx.response.status = 400;
			ctx.response.body = {
				error: 'USER_NOT_FOUND',
				message: 'User was not found',
			};
			return;
		}

		await app.revokePermissions(user);
		ctx.response.body = await app.getPermissions();
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
		const app = await getApp(ctx, +ctx.params.id, viewPermissions, true);

		const params = new URLSearchParams(ctx.request.url.search);

		const period = params.has('period')
			? +(params?.get('period') as string) // Safe because of the check
			: defaultRealtimeLength;

		app && (ctx.response.body = await analyzer.overview(app, period));
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_AUDIENCE,
		]);

		const params = new URLSearchParams(ctx.request.url.search);

		const period = params.has('period')
			? +(params?.get('period') as string) // Safe because of the check
			: defaultRealtimeLength;

		app &&
			(ctx.response.body = await analyzer.audienceRealtime(
				app,
				period,
			));
	},
);

router.get(
	'/:id/audience/day',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_AUDIENCE,
		]);

		const params = new URLSearchParams(ctx.request.url.search);

		const startTime = params.has('start')
			? +(params?.get('start') as string) // Safe because of the check
			: new Date().setUTCHours(0, 0, 0, 0);
		const endTime = params.has('end')
			? +(params?.get('end') as string) // Safe because of the check
			: startTime + dayLength;

		app &&
			(ctx.response.body = await analyzer.audienceDetailed(
				app,
				defaultSessionLength,
				startTime,
				endTime,
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_AUDIENCE,
		]);

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
				app,
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_AUDIENCE,
		]);
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_SERVER_LOGS,
		]);
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
	'/:id/logs/server/aggregate',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_SERVER_LOGS,
		]);

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
				app,
				'server',
				startTime,
				endTime,
			));
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_CLIENT_LOGS,
		]);
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
	'/:id/logs/client/aggregate',
	auth.authenticated(),
	rateLimiter({
		tag: 'user',
		id: async (ctx) => (await auth.methods.getSession(ctx))?.id?.toString(),
	}),
	async (ctx) => {
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_CLIENT_LOGS,
		]);

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
				app,
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_FEEDBACK,
		]);
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.VIEW_METRICS,
		]);
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
		const app = await getApp(ctx, +ctx.params.id, [
			PERMISSIONS.EDIT_PERMISSIONS,
		]);

		if (!app) {
			return;
		}

		app.delete();
		ctx.response.body = app;
	},
);

export default router;
