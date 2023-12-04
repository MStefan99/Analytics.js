import { Context, Middleware } from '../deps.ts';

import Session from './session.ts';
import User from './user.ts';
import App from './app.ts';

async function getSession(ctx: Context): Promise<Session | null> {
	if (ctx.state.session) {
		return ctx.state.session;
	}

	const id = ctx.request.headers.get('api-key') ??
		(await ctx.cookies.get('SID'));

	if (id === null || id === undefined) {
		return null;
	}

	return (ctx.state.session = await Session.getByPublicID(id));
}

async function getUser(ctx: Context): Promise<User | null> {
	if (ctx.state.user) {
		return ctx.state.user;
	}

	if (!ctx.state.session) {
		await getSession(ctx);
	}

	return (ctx.state.user = await User.getByID(ctx.state.session.userID));
}

async function getAppByAudienceKey(ctx: Context): Promise<App | null> {
	if (ctx.state.app) {
		return ctx.state.app;
	}

	const key = ctx.request.headers.get('audience-key');

	if (key === null || key === undefined) {
		return null;
	}

	return (ctx.state.app = await App.getByAudienceKey(key));
}

async function getAppByTelemetryKey(ctx: Context): Promise<App | null> {
	if (ctx.state.app) {
		return ctx.state.app;
	}

	const key = ctx.request.headers.get('telemetry-key');

	if (key === null || key === undefined) {
		return null;
	}

	return (ctx.state.app = await App.getByTelemetryKey(key));
}

export default {
	test: {
		async authenticated(ctx: Context): Promise<boolean> {
			return !!await getSession(ctx);
		},

		async hasAudienceKey(ctx: Context): Promise<boolean> {
			return !!await getAppByAudienceKey(ctx);
		},

		async hasTelemetryKey(ctx: Context): Promise<boolean> {
			return !!await getAppByTelemetryKey(ctx);
		},
	},

	methods: {
		getSession,
		getUser,
		getAppByAudienceKey,
		getAppByTelemetryKey,
	},

	authenticated(): Middleware {
		return async (ctx, next) => {
			if (!(await this.test.authenticated(ctx))) {
				ctx.response.status = 401;
				ctx.response.body = {
					error: 'NOT_AUTHENTICATED',
					message: 'You must sign in to do this',
				};
			} else {
				await next();
			}
		};
	},

	hasAudienceKey(): Middleware {
		return async (ctx, next) => {
			if (!await this.test.hasAudienceKey(ctx)) {
				ctx.response.status = 401;
				ctx.response.body = {
					error: 'NOT_AUTHENTICATED',
					message: 'You must provide an audience key to do this',
				};
			} else {
				await next();
			}
		};
	},

	hasTelemetryKey(): Middleware {
		return async (ctx, next) => {
			if (!await this.test.hasTelemetryKey(ctx)) {
				ctx.response.status = 401;
				ctx.response.body = {
					error: 'NOT_AUTHENTICATED',
					message: 'You must provide a telemetry key to do this',
				};
			} else {
				await next();
			}
		};
	},

	condition(cb: (ctx: Context) => Promise<boolean>): Middleware {
		return async (ctx, next) => {
			if (!(await cb(ctx))) {
				ctx.response.status = 403;
				ctx.response.body = {
					error: 'NOT_AUTHORIZED',
					message: 'You are not allowed to do this',
				};
			} else {
				await next();
			}
		};
	},
};
