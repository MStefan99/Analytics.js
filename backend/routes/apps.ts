import { Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import App from '../lib/app.ts';

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

export default router;
