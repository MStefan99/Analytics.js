import openDB, { deleteDB } from './db.ts';
import User from './user.ts';
import { encode as hexEncode } from '../deps.ts';

function getRandomString(byteCount: number): string {
	const dec = new TextDecoder();
	const data = crypto.getRandomValues(new Uint8Array(byteCount));

	return dec.decode(hexEncode(data));
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

export type LogAggregate = {
	time: number;
	day: string;
	level: number;
	count: number;
};

// export type LogAggregate = {
// 	[key: number]: { // Log level
// 		[key: number]: number // Log timestamp and count
// 	}
// }

type AppProps = {
	id: number;
	name: string;
	description?: string;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;
};

class App {
	id: number;
	name: string;
	description: string | null;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;

	constructor(props: AppProps) {
		this.id = props.id;
		this.name = props.name;
		this.description = props.description ?? null;
		this.audienceKey = props.audienceKey;
		this.telemetryKey = props.telemetryKey;
		this.ownerID = props.ownerID;
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
					this.ownerID,
				],
			);
	}

	static async create(
		user: User,
		name: string,
		description?: string,
	): Promise<App> {
		const audienceKey = getRandomString(8);
		const telemetryKey = getRandomString(8);

		const db = await openDB();
		await db.queryEntries(
			`insert into apps(name, description, audience_key, telemetry_key, owner_id)
       values (?, ?, ?, ?, ?)`,
			[
				name,
				description,
				audienceKey,
				telemetryKey,
				user.id,
			],
		);

		return new App({
			id: db.lastInsertRowId,
			name,
			description,
			audienceKey,
			telemetryKey,
			ownerID: user.id,
		});
	}

	static async getByID(id: number): Promise<App | null> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id      as ownerID
       from apps
       where id = ?`,
			[id],
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
              telemetry_key as telemetryKey,
              owner_id      as ownerID
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
              telemetry_key as telemetryKey,
              owner_id      as ownerID
       from apps
       where telemetry_key = ?`,
			[id],
		);

		return rows.length ? new App(rows[0]) : null;
	}

	static async getByUser(user: User): Promise<App[]> {
		const db = await openDB();
		const rows = await db.queryEntries<AppProps>(
			`select id,
              name,
              description,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id      as ownerID
       from apps
       where owner_id = ?`,
			[user.id],
		);

		return rows.map<App>((r) => new App(r));
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

	async getHits(startTime: number): Promise<ClientHit[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<ClientHit>(
			`select clients.id as clientID, url, referrer, time, ua, lang
       from hits
                join clients on client_id = clients.id
       where hits.time > ?
       limit 5000`,
			[Math.floor(startTime / 1000)],
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
		level = 0,
	): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select *
       from ${type}_logs
       where time >= ?
         and level >= ?
       limit 5000`,
			[Math.floor(startTime / 1000), level],
		).map((log) => ({ ...log, time: log.time * 1000 }));
	}

	async #getLogAggregates(
		type: 'server' | 'client',
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<LogAggregate>(
			`select time,
              date(time, 'unixepoch') as day,
              level,
              count(level)            as count
       from ${type}_logs
       where time between ? and ?
       group by day, level
       order by day, level
       limit 5000`,
			[startTime / 1000, endTime / 1000],
		)
			.map((a) => {
				const date = new Date(a.time * 1000);
				date.setHours(0, 0, 0, 0);
				return { ...a, time: date.getTime() };
			});
	}

	async createClientLog(message: string, level: number, tag?: string) {
		return await this.#createLog('client', message, level, tag);
	}

	async getClientLogs(startTime: number, level = 0) {
		return await this.#getLogs('client', startTime, level);
	}

	async createServerLog(message: string, level: number, tag?: string) {
		return await this.#createLog('server', message, level, tag);
	}

	async getServerLogs(startTime: number, level = 0): Promise<Log[]> {
		return await this.#getLogs('server', startTime, level);
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

	async getFeedback(startTime: number): Promise<Feedback[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Feedback>(
			`select *
       from feedback
       where time > ?
       limit 1000`,
			[Math.floor(startTime / 1000)],
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

	async getMetrics(startTime: number): Promise<Metrics[]> {
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
       where time > ?
       limit 500`,
			[Math.floor(startTime / 1000)],
		).map((metrics) => ({ ...metrics, time: metrics.time * 1000 }));
	}

	async getHitAggregates(
		startTime: number,
		endTime: number,
	): Promise<HitAggregate[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<HitAggregate>(
			`select time                      as time,
              date(time, 'unixepoch')   as day,
              count(distinct client_id) as clients,
              count(*)                  as views
       from hits
       where time between ? and ?
       group by day
       order by day
       limit 3650`,
			[startTime / 1000, endTime / 1000],
		)
			.map((a) => {
				const date = new Date(a.time * 1000);
				date.setHours(0, 0, 0, 0);
				return { ...a, time: date.getTime() };
			});
	}

	async getServerLogAggregates(
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		return await this.#getLogAggregates('server', startTime, endTime);
	}

	async getClientLogAggregates(
		startTime: number,
		endTime: number,
	): Promise<LogAggregate[]> {
		return await this.#getLogAggregates('client', startTime, endTime);
	}

	async delete(keepDB = false): Promise<void> {
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
