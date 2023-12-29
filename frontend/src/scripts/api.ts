import appState from './store';
import demoData from '../assets/demo-data.json';

import type {
	App,
	AudienceAggregate,
	AuthResponse,
	DayAudience,
	ErrorResponse,
	Log,
	LogAggregate,
	MessageResponse,
	Metrics,
	NewApp,
	NewUser,
	Overview,
	PageAggregate,
	RealtimeAudience,
	Session,
	UpdateUser,
	User
} from './types';

const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '';
const notConfigured: ErrorResponse = {error: 'NOT_CONFIGURED', message: 'Not configured'};
const notAuthenticated: ErrorResponse = {
	error: 'NOT_AUTHENTICATED',
	message: 'You must sign in to do this'
};
const requestFailed: ErrorResponse = {error: 'REQ_FAILED', message: 'Request failed'};
const notFound: ErrorResponse = {error: 'NOT_FOUND', message: 'Route not found'};

enum RequestMethod {
	GET = 'GET',
	POST = 'POST',
	PATCH = 'PATCH',
	PUT = 'PUT',
	DELETE = 'DELETE'
}

type RequestParams = {
	auth?: boolean;
	method?: RequestMethod;
	body?: unknown;
	query?: Record<string, string | number | null | undefined>;
};

function resolveReferences<T>(data: T, params?: RequestParams): T {
	const now = Date.now();

	if (typeof data === 'string') {
		if (data.startsWith('@')) {
			data = resolveReferences<T>(getDemoData<T>(data.substring(1)), params);
		} else if (data.startsWith('-')) {
			data = (now + +data) as T;
		}
	} else if (Array.isArray(data)) {
		(data as T[]) = data.map(
			(value, index) => ((data as T[])[index] = resolveReferences<T>(value, params))
		);
	} else {
		for (const key in data) {
			if (typeof data[key] === 'object' || Array.isArray(data[key])) {
				(data as Record<string, T>)[key] = resolveReferences<T>(data[key] as T, params);
			} else if (key.startsWith('-')) {
				const newKey = now + +key;
				if (
					(params?.query?.start ? +params.query.start < newKey : +key > -1000 * 60 * 60 * 24 * 7) &&
					(params?.query?.end ? newKey < +params.query.end : true)
				) {
					(data as Record<string, T>)[newKey] = resolveReferences<T>(data[key] as T, params);
				}
				delete data[key];
			} else {
				(data as Record<string, T>)[key] = resolveReferences<T>(data[key] as T, params);
			}
		}
	}

	return data as T;
}

function getDemoData<T>(path: string): T {
	let obj = structuredClone(demoData) as T;

	for (const prop of path.split('/').filter((v) => v.length)) {
		if (typeof obj !== 'object') {
			throw new Error('Cannot read property ' + prop + ' of ' + obj);
		}

		if (!(prop in obj)) {
			throw notFound;
		}

		obj = (obj as {[key: string]: T})[prop];
	}

	if (typeof obj === 'object' && '_root' in obj) {
		obj = obj._root as T;
	}

	return obj as T;
}

function request<T>(path: string, params?: RequestParams): Promise<T> {
	if (appState.backendURL !== 'demo') {
		return new Promise((resolve, reject) => {
			if (!appState.backendURL) {
				reject(notConfigured);
				return;
			}

			if (params?.auth && !appState.apiKey) {
				reject(notAuthenticated);
				return;
			}

			const query =
				params?.query &&
				Object.keys(params?.query).reduce<Record<string, string>>((q, key) => {
					params.query?.[key] !== null &&
						params.query?.[key] !== undefined &&
						(q[key] = params.query[key].toString());
					return q;
				}, {});
			const queryString =
				query && Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';

			fetch(appState.backendURL + apiPrefix + path + queryString, {
				method: params?.method ?? 'GET',
				headers: {
					...(!!params?.auth && {
						'API-Key': appState.apiKey
					}),
					...(params?.method !== RequestMethod.GET && {
						'Content-Type': 'application/json'
					})
				},
				...(!!params?.body && {body: JSON.stringify(params.body)})
			})
				.then((res) => {
					if (res.ok) {
						return res.json();
					} else {
						return res.json().then((err) => reject(err));
					}
				})
				.then((data) => resolve(data as T))
				.catch((err) => reject(err));
		});
	} else {
		const res = resolveReferences<T>(getDemoData<T>(path), params);
		return Promise.resolve(res);
	}
}

function connect(host: string | null): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		if (!host) {
			reject(notConfigured);
			return;
		} else if (host === 'demo') {
			resolve(true);
		}

		fetch(host + apiPrefix)
			.then((res) => resolve(res.ok && res.headers.get('who-am-i') === 'Crash Course'))
			.catch(() => {
				reject(requestFailed);
			});
	});
}

function booleanify(promise: Promise<unknown>): Promise<boolean> {
	return new Promise((resolve, reject) =>
		promise.then((res) => resolve(!!res)).catch((err) => reject(err))
	);
}

export const ConnectionAPI = {
	testURL: (host: string | null) => connect(host),
	test: () => connect(appState.backendURL)
};

export const AuthAPI = {
	login: (username: User['username'], password: NewUser['password']) =>
		new Promise<User>((resolve, reject) => {
			request<AuthResponse>('/login', {method: RequestMethod.POST, body: {username, password}})
				.then((data) => {
					appState.setApiKey(data.key);
					appState.setUser(data.user);
					resolve(data.user);
				})
				.catch((err) => reject(err));
		}),
	register: (username: User['username'], password: NewUser['password']) =>
		new Promise<User>((resolve, reject) => {
			request<AuthResponse>('/register', {method: RequestMethod.POST, body: {username, password}})
				.then((data) => {
					appState.setApiKey(data.key);
					appState.setUser(data.user);
					resolve(data.user);
				})
				.catch((err) => reject(err));
		}),
	test: () => booleanify(request('/auth', {auth: true})),
	me: () => request<User>('/me', {auth: true}),
	edit: (user: UpdateUser) =>
		request<User>('/me', {auth: true, method: RequestMethod.PATCH, body: user}),
	logout: () =>
		new Promise<boolean>((resolve, reject) => {
			request<MessageResponse>('/logout', {
				auth: true
			})
				.then(() => {
					appState.setApiKey(null);
					appState.setUser(null);
					resolve(true);
				})
				.catch((err) => reject(err));
		}),
	delete: () =>
		new Promise<boolean>((resolve, reject) =>
			request<User>('/me', {auth: true, method: RequestMethod.DELETE})
				.then(() => {
					appState.setApiKey(null);
					appState.setUser(null);
					resolve(true);
				})
				.catch((err) => reject(err))
		)
};

export const SessionAPI = {
	getAll: () => request<Session[]>('/sessions', {auth: true}),
	// TODO: clear state key
	logout: (id: Session['id']) =>
		request<Session>('/sessions/' + id, {
			auth: true,
			method: RequestMethod.DELETE
		}),
	logoutAll: () =>
		booleanify(request<MessageResponse>('/sessions', {auth: true, method: RequestMethod.DELETE}))
};

export const AppAPI = {
	add: (app: NewApp) => request<App>('/apps', {auth: true, method: RequestMethod.POST, body: app}),
	getAll: () => request<App[]>('/apps', {auth: true}),
	getByID: (id: App['id']) => request<App>('/apps/' + id, {auth: true}),
	edit: (app: App) =>
		request<App>('/apps/' + app.id, {auth: true, method: RequestMethod.PATCH, body: app}),
	getOverview: (id: App['id'], period?: number) =>
		request<Overview>('/apps/' + id + '/overview', {
			auth: true,
			query: {period}
		}),
	getRealtimeAudience: (id: App['id'], period?: number) =>
		request<RealtimeAudience>('/apps/' + id + '/audience/now', {auth: true, query: {period}}),
	getDayAudience: (id: App['id'], start?: number) =>
		request<DayAudience>('/apps/' + id + '/audience/day', {auth: true, query: {start}}),
	getAudienceAggregate: (id: App['id'], start?: number, end?: number) =>
		request<AudienceAggregate>('/apps/' + id + '/audience/aggregate', {
			auth: true,
			query: {start, end}
		}),
	getPageAggregate: (id: App['id'], start?: number, end?: number) =>
		request<PageAggregate>('/apps/' + id + '/pages/aggregate', {auth: true, query: {start, end}}),
	getLogs: (
		id: App['id'],
		type: 'server' | 'client',
		level?: number,
		start?: number,
		end?: number
	) =>
		request<Log[]>('/apps/' + id + '/logs/' + type, {
			auth: true,
			query: {level, start, end}
		}),
	getLogAggregate: (id: App['id'], type: 'server' | 'client', start?: number, end?: number) =>
		request<LogAggregate>('/apps/' + id + '/logs/' + type + '/aggregate', {
			auth: true,
			query: {start, end}
		}),
	getFeedbacks: (id: App['id'], start?: number, end?: number) =>
		request<Log[]>('/apps/' + id + '/feedback', {
			auth: true,
			query: {start, end}
		}),
	getMetrics: (id: App['id'], start?: number, end?: number) =>
		request<Metrics[]>('/apps/' + id + '/metrics', {
			auth: true,
			query: {start, end}
		}),
	delete: (app: App) => request<App>('/apps/' + app.id, {auth: true, method: RequestMethod.DELETE})
};

export default {
	connection: ConnectionAPI,
	sessions: SessionAPI,
	auth: AuthAPI,
	apps: AppAPI
};
