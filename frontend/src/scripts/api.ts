import appState from './store';
import type {
	App,
	AppOverview,
	DayAudience,
	Log,
	NewUser,
	RealtimeAudience,
	Session,
	UpdateUser,
	User
} from './types';

type MessageResponse = {
	code: string;
	message: string;
};

type ErrorResponse = {
	error: string;
	message: string;
};

type AuthResult = {
	user: User;
	key: string;
};

const apiPrefix = '';
const notConfigured = {error: 'NOT_CONFIGURED', message: 'Not configured'} as ErrorResponse;
const notAuthenticated = {
	error: 'NOT_AUTHENTICATED',
	message: 'You must sign in to do this'
} as ErrorResponse;
const requestFailed = {error: 'REQ_FAILED', message: 'Request failed'} as ErrorResponse;

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
	query?: Record<string, string>;
};

function request<T>(path: string, params?: RequestParams): Promise<T> {
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
				params.query?.[key].trim() && (q[key] = params.query[key]);
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
}

function connect(host: string | null): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		if (!host) {
			reject(notConfigured);
			return;
		}

		fetch(host + apiPrefix)
			.then((res) => resolve(res.ok && res.headers.get('who-am-i') === 'Invenfinder'))
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
			request<AuthResult>('/login', {method: RequestMethod.POST, body: {username, password}})
				.then((data) => {
					appState.setApiKey(data.key);
					appState.setUser(data.user);
					resolve(data.user);
				})
				.catch((err) => reject(err));
		}),
	register: (username: User['username'], password: NewUser['password']) =>
		new Promise<User>((resolve, reject) => {
			request<AuthResult>('/register', {method: RequestMethod.POST, body: {username, password}})
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
	delete: () => request<User>('/me', {auth: true, method: RequestMethod.DELETE})
};

export const SessionAPI = {
	getAll: () => request<Session[]>('/sessions', {auth: true}),
	logout: (id: Session['id']) =>
		request<Session>('/sessions/' + id, {
			auth: true,
			method: RequestMethod.DELETE
		}),
	logoutAll: () =>
		booleanify(request<MessageResponse>('/sessions', {auth: true, method: RequestMethod.DELETE}))
};

export const AppAPI = {
	add: (name: string) =>
		request<App>('/apps', {auth: true, method: RequestMethod.POST, body: {name}}),
	getAll: () => request<App[]>('/apps', {auth: true}),
	getByID: (id: App['id']) => request<App>('/apps/' + id, {auth: true}),
	getOverview: (id: App['id']) => request<AppOverview>('/apps/' + id + '/overview', {auth: true}),
	getRealtimeAudience: (id: App['id']) =>
		request<RealtimeAudience>('/apps/' + id + '/now', {auth: true}),
	getTodayAudience: (id: App['id']) => request<DayAudience>('/apps/' + id + '/today', {auth: true}),
	getLogs: (id: App['id'], type: 'server' | 'client', startTime?: number, level?: number) =>
		request<Log[]>('/apps/' + id + '/logs/' + type, {
			auth: true,
			query: {startTime: startTime?.toString() ?? '', level: level?.toString() ?? ''}
		}),
	edit: (): null => null,
	delete: (): null => null
};

export default {
	connection: ConnectionAPI,
	sessions: SessionAPI,
	auth: AuthAPI,
	apps: AppAPI
};
