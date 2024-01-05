import { Router } from '../deps.ts';
import auth from '../lib/auth.ts';
import { hasBody } from './middleware.ts';
import { Client } from '../lib/app.ts';

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

	if (!body.url) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_URL',
			message: 'You must provide a URL to record a hit to',
		};
		return;
	}

	const client: Client = (body.ccs && await app.getClientByID(body.ccs)) ??
		await app.createClient(
			ctx.request.headers.get('user-agent') ?? undefined,
			ctx.request.headers.get('accept-language') ?? undefined,
		);

	let referrer = null;
	try {
		if (new URL(body.url).hostname !== new URL(body.referrer).hostname) {
			referrer = body.referrer?.toString().trim();
		}
	} catch {
		// Nothing to do, referrer stays null
	}

	await app.createHit(
		client,
		body.url.toString().trim(),
		referrer,
	);

	ctx.response.status = 201;
	ctx.response.body = {
		session: client.id,
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
	if (!body.message || typeof body.level !== 'number') {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'NO_MESSAGE_OR_LEVEL',
			message: 'You need to provide both message and level',
		};
		return;
	}

	await app.createClientLog(
		typeof body.message !== 'string'
			? JSON.stringify(body.message)
			: body.message.trim(),
		+body.level,
		body.tag?.toString()?.trim(),
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

	app.createFeedback({ message: body.message });

	ctx.response.status = 201;
});

export default router;
