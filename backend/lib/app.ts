import openDB, { deleteDB } from './db.ts';
import User from './user.ts';
import { encodeHex } from '../deps.ts';
import {
	applyPermissions,
	encodePermissions,
	hasPermissions,
	PERMISSIONS,
} from '../../common/permissions.ts';

function getRandomString(byteCount: number): string {
	const data = crypto.getRandomValues(new Uint8Array(byteCount));

	return encodeHex(data);
}

export type Client = {
	id: string;
	ua: string | null;
	lang: string | null;
};

export type Hit = {
	id: number;
	clientID: string;
	url: string;
	referrer: string | null;
	time: number;
};

export type ClientHit = Hit & {
	ua: string;
	lang: string;
};

export type NewLog = {
	tag?: string;
	message: string;
	level: number;
};

export type Log = {
	id: number;
	time: number;
} & NewLog;

export type NewFeedback = {
	message: string;
};

export type Feedback = {
	id: number;
	time: number;
} & NewFeedback;

export type NewMetrics = {
	device?: string;
	cpu?: number;
	memUsed?: number;
	memTotal?: number;
	netUp?: number;
	netDown?: number;
	diskUsed?: number;
	diskTotal?: number;
};

export type Metrics = {
	id: number;
	time: number;
} & NewMetrics;

export type HitAggregate = {
	time: number;
	day: string;
	clients: number;
	views: number;
};

export type PageAggregate = {
	url: string;
	hits: number;
};

export type LogAggregate = {
	time: number;
	day: string;
	level: number;
	count: number;
};

type AppProps = {
	id: number;
	name: string;
	description?: string;
	audienceKey: string;
	telemetryKey: string;
	permissions: number;
};

type AppPermissions = {
	userID: User['id'];
	appID: App['id'];
	permissions: number;
	username: User['username'];
};

class App {
	id: number;
	name: string;
	description: string | null;
	audienceKey?: string;
	telemetryKey?: string;
	permissions: number;

	constructor(props: AppProps) {
		this.id = props.id;
		this.name = props.name;
		this.description = props.description ?? null;
		this.audienceKey = props.audienceKey;
		this.telemetryKey = props.telemetryKey;
		this.permissions = props.permissions;
	}

	toJSON() {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			permissions: this.permissions,
			...(hasPermissions([PERMISSIONS.VIEW_KEYS], this.permissions) &&
				{
					audienceKey: this.audienceKey,
					telemetryKey: this.telemetryKey,
				}),
		};
	}

	async save(): Promise<void> {
		const db = await openDB();
		await db
			.query(
				`update apps
         set name=?,
             description=?
         where id = ?
				`,
				[
					this.name,
					this.description,
					this.id,
				],
			);
	}

	static async create(
		user: User,
		name: string,
		description?: string,
		permissions: number | PERMISSIONS[] = 0xffff,
	): Promise<App> {
		const audienceKey = getRandomString(8);
		const telemetryKey = getRandomString(8);

		const db = await openDB();
		await db.queryEntries(
			`insert into apps(name, description, audience_key, telemetry_key)
       values (?, ?, ?, ?)`,
			[
				name,
				description,
				audienceKey,
				telemetryKey,
			],
		);

		const app = new App({
			id: db.lastInsertRowId,
			name,
			description,
			audienceKey,
			telemetryKey,
			permissions: encodePermissions(permissions),
		});

		await db.queryEntries(
			`insert into permissions(user_id, app_id, permissions)
       values (?, ?, ?)`,
			[
				user.id,
				app.id,
				app.permissions,
			],
		);

		return app;
	}

	static async getByID(id: number, user: User): Promise<App | null> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              permissions
       from apps
                join main.permissions p on apps.id = p.app_id
       where id = ?
         and user_id = ?`,
			[id, user.id],
		);

		return rows.length ? new App(rows[0]) : null;
	}

	static async getByAudienceKey(key: string): Promise<App | null> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey
       from apps
       where audience_key = ?`,
			[key],
		);

		return rows.length ? new App(rows[0]) : null;
	}

	static async getByTelemetryKey(id: string): Promise<App | null> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey
       from apps
       where telemetry_key = ?`,
			[id],
		);

		return rows.length ? new App(rows[0]) : null;
	}

	static async getByUser(
		user: User,
		permissions: number | PERMISSIONS[] = [],
		any = false,
	): Promise<App[]> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              permissions
       from apps
                join main.permissions p on apps.id = p.app_id
       where user_id = ?`,
			[user.id],
		);

		return rows.filter((r) =>
			hasPermissions(permissions, r.permissions, any)
		).map<App>((r) => new App(r));
	}

	async getPermissions(): Promise<AppPermissions[]> {
		const db = await openDB();

		return await db.queryEntries<AppPermissions>(
			`select user_id as userID,
              app_id  as appID,
              permissions,
              username
       from permissions
                join main.users u on u.id = permissions.user_id
       where app_id = ?`,
			[this.id],
		);
	}

	async setPermissions(
		user: User,
		permissions: number | PERMISSIONS[],
	): Promise<void> {
		const db = await openDB();
		await db.queryEntries<Client>(
			`insert into permissions(user_id, app_id, permissions)
       values (?, ?, ?)
       on conflict(user_id, app_id)
           do update set permissions=excluded.permissions
			`,
			[
				user.id,
				this.id,
				encodePermissions(
					applyPermissions(permissions, this.permissions),
				),
			],
		);
	}

	async revokePermissions(user: User): Promise<void> {
		const db = await openDB();
		await db.queryEntries<Client>(
			`delete
       from permissions
       where user_id = ?
         and app_id = ?`,
			[user.id, this.id],
		);
	}

	async createClient(ua?: string, lang?: string): Promise<Client> {
		const id = getRandomString(32);

		const db = await openDB(this.id);
		await db.queryEntries<Client>(
			`insert into clients(id,
                           ua,
                           lang)
       values (?, ?, ?)`,
			[
				id,
				ua ?? null,
				lang ?? null,
			],
		);

		return {
			id,
			ua: ua ?? null,
			lang: lang ?? null,
		};
	}

	async getClientByID(id: number): Promise<Client | null> {
		const db = await openDB(this.id);
		const rows = await db.queryEntries<Client>(
			`select *
       from clients
       where id = ?`,
			[id],
		);

		return rows.length ? rows[0] : null;
	}

	async createHit(
		client: Client,
		url: string,
		referrer?: string,
	): Promise<Hit> {
		const db = await openDB(this.id);
		const time = Date.now();

		await db.query(
			`insert into hits(time, client_id, url, referrer)
       values (?, ?, ?, ?)`,
			[
				Math.floor(time / 1000),
				client.id,
				url,
				referrer ?? null,
			],
		);

		return {
			id: db.lastInsertRowId,
			time,
			clientID: client.id,
			url,
			referrer: referrer ?? null,
		};
	}

	async getHits(startTime: number, endTime: number): Promise<ClientHit[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<ClientHit>(
			`select clients.id as clientID, url, referrer, time, ua, lang
       from hits
                join clients on client_id = clients.id
       where hits.time between ? and ?
       limit 5000`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000)],
		).map((hit) => ({ ...hit, time: hit.time * 1000 }));
	}

	async #createLog(
		type: 'server' | 'client',
		message: string,
		level: number,
		tag?: string,
	): Promise<Log> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into ${type}_logs(time, tag, message, level)
       values (?, ?, ?, ?)`,
			[
				Math.floor(time / 1000),
				tag ?? null,
				message,
				level,
			],
		);

		return {
			id: db.lastInsertRowId,
			time,
			tag,
			message,
			level,
		};
	}

	async #getLogs(
		type: 'server' | 'client',
		startTime: number,
		endTime: number,
		level = 0,
	): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select *
       from ${type}_logs
       where time between ? and ?
         and level >= ?
       limit 5000`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000), level],
		).map((log) => ({ ...log, time: log.time * 1000 }));
	}

	async #getLogAggregate(
		type: 'server' | 'client',
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<LogAggregate>(
			`select time                                 as t,
              min(time)                            as time,
              date(time, 'unixepoch', 'localtime') as day,
              level,
              count(level)                         as count
       from ${type}_logs
       where t between ? and ?
       group by day, level
       order by day, level
       limit 2000`,
			[startTime / 1000, endTime / 1000],
		)
			.map((a) => {
				const date = new Date(a.time * 1000);
				date.setHours(0, 0, 0, 0);
				return { ...a, time: date.getTime(), t: undefined };
			});
	}

	async createClientLog(message: string, level: number, tag?: string) {
		return await this.#createLog('client', message, level, tag);
	}

	async createServerLog(message: string, level: number, tag?: string) {
		return await this.#createLog('server', message, level, tag);
	}

	async getClientLogs(startTime: number, endTime: number, level = 0) {
		return await this.#getLogs('client', startTime, endTime, level);
	}

	async getServerLogs(
		startTime: number,
		endTime: number,
		level = 0,
	): Promise<Log[]> {
		return await this.#getLogs('server', startTime, endTime, level);
	}

	async createFeedback(feedback: NewFeedback): Promise<Feedback> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into feedback(time, message)
       values (?, ?)`,
			[Math.floor(time / 1000), feedback.message],
		);

		return { id: db.lastInsertRowId, time, ...feedback };
	}

	async getFeedback(startTime: number, endTime: number): Promise<Feedback[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Feedback>(
			`select *
       from feedback
       where time between ? and ?
       limit 1000`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000)],
		).map((feedback) => ({ ...feedback, time: feedback.time * 1000 }));
	}

	async createMetrics(metrics: NewMetrics): Promise<Metrics> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into metrics(time, device, cpu, mem_used, mem_total, net_up, net_down, disk_used, disk_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				Math.floor(time / 1000),
				metrics.device,
				metrics.cpu,
				metrics.memUsed,
				metrics.memTotal,
				metrics.netUp,
				metrics.netDown,
				metrics.diskUsed,
				metrics.diskTotal,
			],
		);

		return { id: db.lastInsertRowId, time, ...metrics };
	}

	async getMetrics(startTime: number, endTime: number): Promise<Metrics[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Metrics>(
			`select time,
              device,
              cpu,
              mem_used   as memUsed,
              mem_total  as memTotal,
              net_up     as netUp,
              net_down   as netDown,
              disk_used  as diskUsed,
              disk_total as diskTotal
       from metrics
       where time between ? and ?
       limit 500`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000)],
		).map((metrics) => ({ ...metrics, time: metrics.time * 1000 }));
	}

	async getHitAggregate(
		startTime: number,
		endTime: number,
	): Promise<HitAggregate[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<HitAggregate>(
			`select time                                 as time,
              date(time, 'unixepoch', 'localtime') as day,
              count(distinct client_id)            as clients,
              count(*)                             as views
       from hits
       where time between ? and ?
       group by day
       order by day
       limit 3650`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000)],
		)
			.map((a) => {
				const date = new Date(a.time * 1000);
				date.setHours(0, 0, 0, 0);
				return { ...a, time: date.getTime(), t: undefined };
			});
	}

	async getPageAggregate(
		startTime: number,
		endTime: number,
	) {
		const db = await openDB(this.id);

		return await db.queryEntries<PageAggregate>(
			`select url,
              count(*) as hits
       from hits
       where time between ? and ?
       group by url
       order by hits desc
       limit 1000`,
			[Math.floor(startTime / 1000), Math.floor(endTime / 1000)],
		);
	}

	async getServerLogAggregate(
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		return await this.#getLogAggregate('server', startTime, endTime);
	}

	async getClientLogAggregate(
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		return await this.#getLogAggregate('client', startTime, endTime);
	}

	async delete(keepDB = true): Promise<void> {
		const db = await openDB();
		await db.queryEntries(
			`delete
       from apps
       where id = ?`,
			[this.id],
		);

		if (!keepDB) {
			deleteDB(this.id);
		}
	}
}

export default App;
