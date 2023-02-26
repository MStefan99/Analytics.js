import openDB from './db.ts';
import User from './user.ts';
import { encode as hexEncode } from '../deps.ts';

function getRandomString(byteCount: number): string {
	const dec = new TextDecoder();
	const data = crypto.getRandomValues(new Uint8Array(byteCount));

	return dec.decode(hexEncode(data));
}

type AppProps = {
	id: number;
	name: string;
	description?: string;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;
};

type Log = {
	time: number;
	tag?: string;
	message: string;
	level: number;
};

type Hit = {
	id: string;
	url: string;
	referrer: string;
	time: number;
	ua: string;
	lang: string;
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

	static async create(
		user: User,
		name: string,
		description?: string,
	): Promise<App> {
		const audienceKey = getRandomString(32);
		const telemetryKey = getRandomString(32);

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

		if (!rows.length) {
			return null;
		} else {
			const row = rows[0];
			return new App(row);
		}
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

		if (!rows.length) {
			return null;
		} else {
			const row = rows[0];
			return new App(row);
		}
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

		if (!rows.length) {
			return null;
		} else {
			const row = rows[0];
			return new App(row);
		}
	}

	static async getByUser(user: User): Promise<App[]> {
		const sessions = [];

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

		for (const row of rows) {
			sessions.push(
				new App(row),
			);
		}
		return sessions;
	}

	async getHits(startTime: number): Promise<Hit[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Hit>(
			`select id, url, referrer, time, ua, lang
       from hits
                join sessions on session_id = sessions.id
       where hits.time > ?`,
			[startTime],
		);
	}

	async getClientLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select * from client_logs where time > ? and level > ?`,
			[startTime, level],
		);
	}

	async getServerLogs(startTime: number, level = 0): Promise<Log[]> {
		const db = await openDB(this.id);

		return await db.queryEntries<Log>(
			`select * from server_logs where time > ? and level > ?`,
			[startTime, level],
		);
	}

	async delete(): Promise<void> {
		const db = await openDB();
		await db.queryEntries(
			`delete
       from apps
       where id = ?`,
			[this.id],
		);
	}
}

export default App;
