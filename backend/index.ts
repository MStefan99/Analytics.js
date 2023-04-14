import { Application, Router } from './deps.ts';
import { cors, logger } from './routes/middleware.ts';
import authRouter from './routes/auth.ts';
import sessionRouter from './routes/sessions.ts';
import appRouter from './routes/apps.ts';
import telemetryRouter from './routes/telemetry.ts';
import audienceRouter from './routes/audience.ts';
import { init } from './lib/init.ts';
import rateLimiter from './lib/rateLimiter.ts';

const defaultPort = 3001;
const parsedPort = Deno.env.has('PORT')
	? +(Deno.env.get('PORT') as string) // Safe because of the check above
	: defaultPort;
const port =
	Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65535
		? parsedPort
		: defaultPort;

const app = new Application();
const apiRouter = new Router();
const routers = [
	authRouter,
	sessionRouter,
	appRouter,
	telemetryRouter,
	audienceRouter,
];

app.use(logger());
app.use(cors());

app.use(async (ctx, next) => {
	ctx.response.headers.set('Who-Am-I', 'Crash Course');
	await next();
});

app.use(async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		ctx.response.status = 500;
		console.error(err);

		if (Deno.env.get('ENV') === 'dev') {
			ctx.response.body = {
				error: 'APP_ERROR',
				message: `Error: ${err.message}; Stack: ${err.stack}`,
			};
		} else {
			ctx.response.body = {
				error: 'APP_ERROR',
				message: 'An error occurred while processing your request',
			};
		}
	}
});

apiRouter.get('/', rateLimiter(), (ctx) => {
	ctx.response.body = { message: 'Welcome!' };
});

apiRouter.get('/cc', async (ctx) => {
	await ctx.send({ root: './public', path: 'cc.js' });
});

app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods()); // Responds to OPTIONS and 405/501

for (const router of routers) {
	apiRouter.use(router.routes());
	apiRouter.use(router.allowedMethods());
}

app.use((ctx) => {
	ctx.response.status = 404;
	ctx.response.body = {
		error: 'NOT_FOUND',
		message: 'Route not found',
	};
});

init().then(() => {
	console.log('Starting Oak server...');

	app.listen({ port }).then(() => {
		console.log('Listening at http://localhost:' + port);
	});
});

function exit() {
	console.log('Shutting down...');
	Deno.exit();
}

try {
	Deno.addSignalListener('SIGTERM', exit);
} catch {
	Deno.addSignalListener('SIGINT', exit);
}
