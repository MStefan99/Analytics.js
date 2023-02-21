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

export type App = {
	id: number;
	name: string;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;
};
