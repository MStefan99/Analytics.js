import openDB, { deleteDB } from './db.ts';
import User from './user.ts';
import { encode as hexEncode } from '../deps.ts';

function getRandomString(byteCount: number): string {
	const dec = new TextDecoder();
	const data = crypto.getRandomValues(new Uint8Array(byteCount));

	return dec.decode(hexEncode(data));
}

type ClientProps = {
	id: string;
	ua?: string;
	lang?: string;
};

export class Client {
	id: string;
	ua: string | null;
	lang: string | null;

	constructor(props: ClientProps) {
		this.id = props.id;
		this.ua = props.ua ?? null;
		this.lang = props.lang ?? null;
	}
}

type HitProps = {
	clientID: string;
	url: string;
	referrer?: string;
	time: number;
};

export class Hit {
	clientID: string;
	url: string;
	referrer: string | null;
	time: number;

	constructor(props: HitProps) {
		this.clientID = props.clientID;
		this.url = props.url;
		this.referrer = props.referrer ?? null;
		this.time = props.time;
	}
}

type ClientHitProps = HitProps & {
	ua: string;
	lang: string;
};

export class ClientHit extends Hit {
	ua: string;
	lang: string;

	constructor(props: ClientHitProps) {
		super(props);
		this.ua = props.ua;
		this.lang = props.lang;
	}
}

type LogProps = {
	time: number;
	tag?: string;
	message: string;
	level: number;
};

export class Log {
	time: number;
	tag: string | null;
	message: string;
	level: number;

	constructor(props: LogProps) {
		this.time = props.time;
		this.tag = props.tag ?? null;
		this.message = props.message;
		this.level = props.level;
	}
}

export type NewMetrics = {
	device?: string;
	cpu?: string;
	memFree?: string;
	memTotal?: string;
	netUp?: string;
	netDown?: string;
	diskFree?: string;
	diskTotal?: string;
};

export type Metrics = { time: number } & NewMetrics;

export type NewFeedback = {
	message: string;
};

export type Feedback = {
	time: number;
} & NewFeedback;

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
		await db.queryEntries<ClientProps>(
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

		return new Client({
			id,
			ua,
			lang,
		});
	}

	async getClientByID(id: number): Promise<Client | null> {
		const db = await openDB(this.id);
		const rows = await db.queryEntries<ClientProps>(
			`select *
       from clients
       where id = ?`,
			[id],
		);

		return rows.length ? new Client(rows[0]) : null;
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

		return new Hit({
			clientID: client.id,
			url,
			referrer,
			time,
		});
	}

	async getHits(startTime: number): Promise<ClientHit[]> {
		const db = await openDB(this.id);

		const rows = await db.queryEntries<ClientHitProps>(
			`select id as clientID, url, referrer, time, ua, lang
       from hits
                join clients on client_id = clients.id
       where hits.time > ?`,
			[startTime],
		);

		return rows.map<ClientHit>((r) => new ClientHit(r));
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

		return new Log({
			time,
			tag,
			message,
			level,
		});
	}

	async getClientLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		const rows = await db.queryEntries<LogProps>(
			`select *
       from client_logs
       where time >= ?
         and level >= ?
       limit 5000`,
			[startTime, level],
		);

		return rows.map<Log>((r) => new Log(r));
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

		return new Log({
			time,
			tag,
			message,
			level,
		});
	}

	async getServerLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		const rows = await db.queryEntries<LogProps>(
			`select *
       from server_logs
       where time >= ?
         and level >= ?
       limit 5000`,
			[startTime, level],
		);

		return rows.map<Log>((r) => new Log(r));
	}

	async createMetrics(metrics: NewMetrics): Promise<Metrics> {
		const db = await openDB(this.id);
		const time = Date.now();

		db.query(
			`insert into metrics(time, device, cpu, mem_free, mem_total, net_up, net_down, disk_free, disk_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				time,
				metrics.device,
				metrics.cpu,
				metrics.memFree,
				metrics.memTotal,
				metrics.netUp,
				metrics.netDown,
				metrics.diskFree,
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
			`select *
       from metrics
       where time > ?
       limit 5000`,
			[startTime],
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
