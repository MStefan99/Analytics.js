import { Application, Router } from './deps.ts';
import { cors, logger } from './routes/middleware.ts';
import authRouter from './routes/auth.ts';
import sessionRouter from './routes/sessions.ts';
import appRouter from './routes/apps.ts';
import { init } from './lib/init.ts';

const port = 3001;

const app = new Application();
const apiRouter = new Router({
	prefix: '/api',
});
const routers = [authRouter, sessionRouter, appRouter];

app.use(logger());
app.use(cors());

app.use(async (ctx, next) => {
	ctx.response.headers.set('Who-Am-I', 'Invenfinder');
	await next();
});

app.use(async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		ctx.response.status = 500;
		if (Deno.env.get('env') === 'development') {
			ctx.response.body = {
				error: 'APP_ERROR',
				message: 'An error occurred while processing your request',
			};
		} else {
			ctx.response.body = {
				error: 'APP_ERROR',
				message: `Error: ${err.message}; Stack: ${err.stack}`,
			};
		}
	}
});

apiRouter.get('/', (ctx) => {
	ctx.response.body = { message: 'Welcome!' };
});

apiRouter.get('/options', (ctx) => {
	ctx.response.body = {};
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
