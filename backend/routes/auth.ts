import { Router } from '../deps.ts';

import auth from '../lib/auth.ts';
import User from '../lib/user.ts';
import Session from '../lib/session.ts';
import { hasBody, hasCredentials } from './middleware.ts';

const router = new Router();

// Register
router.post('/register', hasCredentials(), async (ctx) => {
	const body = await ctx.request.body({ type: 'json' }).value;

	const user = await User.create(
		body.username.toString().trim(),
		body.password.toString(),
	);
	const session = await Session.create(
		user,
		ctx.request.ip,
		ctx.request.headers.get('user-agent') ?? 'Unknown',
	);

	ctx.response.status = 201;
	ctx.response.body = { key: session.publicID, user };
});

// Log in
router.post('/login', hasCredentials(), async (ctx) => {
	const body = await ctx.request.body({ type: 'json' }).value;
	const user = await User.getByUsername(body.username.toString().trim());

	if (user === null) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
		return;
	} else if (!(await user.verifyPassword(body.password.toString()))) {
		ctx.response.status = 400;
		ctx.response.body = {
			error: 'WRONG_PASSWORD',
			message: 'Wrong password',
		};
		return;
	}

	const session = await Session.create(
		user,
		ctx.request.ip,
		ctx.request.headers.get('user-agent') ?? 'Unknown',
	);

	ctx.response.status = 201;
	ctx.response.body = { key: session.publicID, user };
});

// Check authentication status
router.get('/auth', auth.authenticated(), (ctx) => {
	ctx.response.body = { message: 'OK' };
});

// Get user currently logged in as
router.get('/me', auth.authenticated(), async (ctx) => {
	const user = await auth.methods.getUser(ctx);

	if (!user) {
		// Should in theory never get here
		ctx.response.status = 500;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
	} else {
		ctx.response.body = user;
	}
});

// Edit user currently logged in as
router.patch('/me', hasBody(), auth.authenticated(), async (ctx) => {
	const body = await ctx.request.body({ type: 'json' }).value;

	const user = await auth.methods.getUser(ctx);
	if (user === null) {
		ctx.response.status = 500;
		ctx.response.body = {
			error: 'USER_NOT_FOUND',
			message: 'User was not found',
		};
		return;
	}

	if (body.password.toString()?.length) {
		await user.setPassword(body.password.toString());
	}

	await user.save();
	ctx.response.body = user;
});

// Log out
router.get('/logout', auth.authenticated(), async (ctx) => {
	ctx.response.body = { message: 'OK' };

	const session = await auth.methods.getSession(ctx);
	session?.delete();
});

// Delete account
router.delete(
	'/me',
	auth.authenticated(),
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

		user.delete();
		ctx.response.body = user;
	},
);

export default router;
