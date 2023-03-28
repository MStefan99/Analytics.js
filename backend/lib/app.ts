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
	clientID: string;
	url: string;
	referrer: string | null;
	time: number;
};

export type ClientHit = Hit & {
	ua: string;
	lang: string;
};

export type Log = {
	time: number;
	tag?: string;
	message: string;
	level: number;
};

export type NewFeedback = {
	message: string;
};

export type Feedback = {
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

export type Metrics = { time: number } & NewMetrics;

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
				`insert or
         replace
         into apps(id,
                   name,
                   description,
                   audience_key,
                   telemetry_key,
                   owner_id)
         values (?, ?, ?, ?, ?, ?)`,
				[
					this.id,
					this.name,
					this.description,
					this.audienceKey,
					this.telemetryKey,
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
			id: db.lastInsertRowId ?? 0,
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
			ua,
			lang,
		} as Client;
	}

	async getClientByID(id: number): Promise<Client | null> {
		const db = await openDB(this.id);
		const rows = await db.queryEntries<Client>(
			`select *
       from clients
       where id = ?`,
			[id],
		);

		return rows.length ? rows[0] as Client : null;
	}

	async createHit(client: Client, url: string, referrer?: string) {
		const db = await openDB(this.id);
		const time = Date.now();

		await db.query(
			`insert into hits(client_id, url, referrer, time)
       values (?, ?, ?, ?)`,
			[
				client.id,
				url,
				referrer ?? null,
				time,
			],
		);

		return {
			clientID: client.id,
			url,
			referrer,
			time,
		} as Hit;
	}

	async getHits(startTime: number): Promise<ClientHit[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<ClientHit>(
			`select id as clientID, url, referrer, time, ua, lang
       from hits
                join clients on client_id = clients.id
       where hits.time > ?`,
			[startTime],
		);
	}

	async createClientLog(message: string, level: number, tag?: string) {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into client_logs(time, tag, message, level)
       values (?, ?, ?, ?)`,
			[
				time,
				tag ?? null,
				message,
				level,
			],
		);

		return {
			time,
			tag,
			message,
			level,
		} as Log;
	}

	async getClientLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select *
       from client_logs
       where time >= ?
         and level >= ?
       limit 5000`,
			[startTime, level],
		);
	}

	async createServerLog(message: string, level: number, tag?: string) {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into server_logs(time, tag, message, level)
       values (?, ?, ?, ?)`,
			[
				time,
				tag ?? null,
				message,
				level,
			],
		);

		return {
			time,
			tag,
			message,
			level,
		} as Log;
	}

	async getServerLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select *
       from server_logs
       where time >= ?
         and level >= ?
       limit 5000`,
			[startTime, level],
		);
	}

	async createFeedback(feedback: NewFeedback): Promise<Feedback> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into feedback(time, message)
              values (?, ?)`,
			[time, feedback.message],
		);

		const f = feedback as Feedback;
		f.time = time;
		return f;
	}

	async getFeedback(startTime: number): Promise<Feedback[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Feedback>(
			`select *
       from feedback
       where time > ?
       limit 5000`,
			[startTime],
		);
	}

	async createMetrics(metrics: NewMetrics): Promise<Metrics> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into metrics(time, device, cpu, mem_used, mem_total, net_up, net_down, disk_used, disk_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				time,
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

		const m = metrics as Metrics;
		m.time = time;
		return m;
	}

	async getMetrics(startTime: number): Promise<Metrics[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Metrics>(
			`select time,
              device,
              cpu,
              mem_used as memUsed,
              mem_total as memTotal,
              net_up as netUp,
              net_down as netDown,
              disk_used as diskUsed,
              disk_total as diskTotal
       from metrics
       where time > ?
       limit 5000`,
			[startTime],
		);
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
