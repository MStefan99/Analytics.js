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
	publicKey: string;
	privateKey: string;
	ownerID: number;
};

class App {
	id: number;
	name: string;
	publicKey: string;
	privateKey: string;
	ownerID: number;

	constructor(props: AppProps) {
		this.id = props.id;
		this.name = props.name;
		this.publicKey = props.publicKey;
		this.privateKey = props.privateKey;
		this.ownerID = props.ownerID;
	}

	static async create(user: User, name: string): Promise<App> {
		const publicKey = getRandomString(32);
		const privateKey = getRandomString(32);

		const client = await openDB();
		await client.queryEntries(
			`insert into apps(name, public_key, private_key, owner_id)
			 values (?, ?, ?, ?)`,
			[
				name,
				publicKey,
				privateKey,
				user.id,
			],
		);

		return new App({
			id: client.lastInsertRowId ?? 0,
			name,
			publicKey,
			privateKey,
			ownerID: user.id,
		});
	}

	static async getByID(id: number): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
              name,
              public_key  as publicKey,
              private_key as privateKey,
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

	static async getByPublicKey(key: string): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
       name,
              public_key  as publicKey,
              private_key as privateKey,
              owner_id    as ownerID
			 from apps
			 where public_key=?`,
			[key],
		);

		if (!rows.length) {
			return null;
		} else {
			const row = rows[0];
			return new App(row);
		}
	}

	static async getByPrivateKey(id: string): Promise<App | null> {
		const client = await openDB();
		const rows = await client.queryEntries<AppProps>(
			`select id,
              name,
              public_key  as publicKey,
              private_key as privateKey,
              owner_id    as ownerID
			 from apps
			 where private_key=?`,
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
              public_key  as publicKey,
              private_key as privateKey,
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
