import { Context, Middleware } from '../deps.ts';

export async function getBody(ctx: Context) {
	try {
		return (await ctx.request.body({ type: 'json' }).value);
	} catch {
		return null;
	}
}

export function hasBody(): Middleware {
	return async (ctx, next) => {
		if (await getBody(ctx)) {
			await ctx.request.body().value;
			await next();
		} else {
			ctx.response.status = 400;
			ctx.response.body = {
				error: 'INVALID_BODY',
				message:
					'Failed to parse request body. Check for errors and try again.',
			};
		}
	};
}

export function hasCredentials(): Middleware {
	return async (ctx, next) => {
		if (await getBody(ctx)) {
			const body = await ctx.request.body({ type: 'json' }).value;

			if (!body.username?.length) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: 'NO_USERNAME',
					message: 'Username must be provided',
				};
				return;
			} else if (!body.password?.length) {
				ctx.response.status = 400;
				ctx.response.body = {
					error: 'NO_PASSWORD',
					message: 'Password must be provided',
				};
				return;
			}

			await next();
		} else {
			ctx.response.status = 400;
			ctx.response.body = {
				error: 'NO_CREDENTIALS',
				message: 'Credentials must be provided',
			};
		}
	};
}

export function logger(): Middleware {
	return async (ctx, next) => {
		const start = new Date();
		await next();
		const req = ctx.request;
		console.log(
			`${req.method} ${
				req.url.pathname + req.url.search
			} from ${req.ip} at ${start.getHours()}:${
				start.getMinutes().toString().padStart(2, '0')
			}:${start.getSeconds().toString().padStart(2, '0')} ` +
				`on ${start.getDay()}.${start.getMonth()}.${start.getFullYear()} - ${ctx.response.status} in ${
					Date.now() - start.getTime()
				} ms`,
		);
	};
}

export function cors(): Middleware {
	return async (ctx, next) => {
		if (Deno.env.get('ENV') === 'dev') {
			ctx.response.headers.set('Access-Control-Allow-Origin', '*');
		} else {
			const origin = Deno.env.get('CORS_ORIGIN');
			origin &&
				ctx.response.headers.set('Access-Control-Allow-Origin', origin);
		}

		ctx.response.headers.set('Access-Control-Allow-Headers', '*');
		ctx.response.headers.set('Access-Control-Allow-Methods', '*');
		ctx.response.headers.set('Access-Control-Expose-Headers', '*');
		ctx.response.headers.set('Access-Control-Max-Age', '86400');

		await next();
	};
}
