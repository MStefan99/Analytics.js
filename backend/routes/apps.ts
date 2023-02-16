import { Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';
import { hasBody } from './middleware.ts';
import { initApp } from '../lib/init.ts';

const router = new Router({
	prefix: '/apps',
});

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

	const app = await App.create(user, body.name.trim());
	await initApp(app.id);

	ctx.response.status = 201;
	ctx.response.body = app;
});

export default router;
