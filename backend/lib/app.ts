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
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;
};

class App {
	id: number;
	name: string;
	audienceKey: string;
	telemetryKey: string;
	ownerID: number;

	constructor(props: AppProps) {
		this.id = props.id;
		this.name = props.name;
		this.audienceKey = props.audienceKey;
		this.telemetryKey = props.telemetryKey;
		this.ownerID = props.ownerID;
	}

	static async create(user: User, name: string): Promise<App> {
		const audienceKey = getRandomString(32);
		const telemetryKey = getRandomString(32);

		const client = await openDB();
		await client.queryEntries(
			`insert into apps(name, audience_key, telemetry_key, owner_id)
			 values (?, ?, ?, ?)`,
			[
				name,
				audienceKey,
				telemetryKey,
				user.id,
			],
		);

		return new App({
			id: client.lastInsertRowId ?? 0,
			name,
			audienceKey,
			telemetryKey,
			ownerID: user.id,
		});
	}

	static async getByID(id: number): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
              name,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id    as ownerID
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

	static async getByaudienceKey(key: string): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
       name,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id    as ownerID
			 from apps
			 where audience_key=?`,
			[key],
		);

		if (!rows.length) {
			return null;
		} else {
			const row = rows[0];
			return new App(row);
		}
	}

	static async getBytelemetryKey(id: string): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
              name,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id    as ownerID
			 from apps
			 where telemetry_key=?`,
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

		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
              name,
              audience_key  as audienceKey,
              telemetry_key as telemetryKey,
              owner_id    as ownerID
			 from apps
			 where owner_id=?`,
			[user.id],
		);

		for (const row of rows) {
			sessions.push(
				new App(row),
			);
		}
		return sessions;
	}

	async delete(): Promise<void> {
		const client = await openDB();
		await client.queryEntries(
			`delete
       from apps
       where id = ?`,
			[this.id],
		);
	}
}

export default App;
