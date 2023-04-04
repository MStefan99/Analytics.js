type BaseUser = {
	username: string;
};

export type User = {
	id: number;
} & BaseUser;

export type NewUser = BaseUser & {
	password: string;
};

export type UpdateUser = {
	id: User['id'];
	username?: BaseUser['username'];
	password?: NewUser['password'];
};

export type Session = {
	id: string;
	ip: string;
	ua: string;
	time: number;
};

export type NewApp = {
	name: string;
	description?: string;
};

export type App = NewApp & {
	id: number;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;
};

export type AppOverview = {
	currentUsers: number;
	views: {[key: string]: number};
	clientLogs: {[key: string]: {[key: string]: number}};
	serverLogs: {[key: string]: {[key: string]: number}};
};

export type RealtimeAudience = {
	currentUsers: number;
	pages: {[key: string]: number};
	sessions: {[key: string]: number};
	referrers: {[key: string]: number};
};

export type DayAudience = {
	bounceRate: number;
	avgDuration: number;
	users: number;
	sessions: [
		{
			duration: number;
			ua: string;
			pages: {url: string; referrer: string | null; time: number}[];
		}
	];
};

export type HistoricalAudience = {
	clients: {[key: number]: number};
	views: {[key: number]: number};
};

export type Log = {
	id: number;
	time: number;
	tag?: string;
	message: string;
	level: number;
};

export type HistoricalLogs = {
	serverLogs: {[key: number]: {[key: number]: number}};
	clientLogs: {[key: number]: {[key: number]: number}};
};

export type Feedback = {
	id: number;
	time: number;
	message: string;
};

export type Metrics = {
	time: number;
	device?: string;
	cpu?: number;
	memUsed?: number;
	memTotal?: number;
	netUp?: number;
	netDown?: number;
	diskUsed?: number;
	diskTotal?: number;
};
