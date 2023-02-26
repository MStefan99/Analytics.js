import { decode as hexDecode, encode as hexEncode } from '../deps.ts';

import openDB from './db.ts';

const PBKDF2ITERATIONS = 100000;

function buf2hex(buf: Uint8Array): string {
	const dec = new TextDecoder();

	return dec.decode(hexEncode(buf));
}

function hex2buf(str: string): Uint8Array {
	const enc = new TextEncoder();

	return hexDecode(enc.encode(str));
}

async function pbkdf2(password: string, salt: string): Promise<string> {
	const enc = new TextEncoder();
	const dec = new TextDecoder();

	const importedKey = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	);
	const generatedKey = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: hex2buf(salt),
			iterations: PBKDF2ITERATIONS,
			hash: 'SHA-256',
		},
		importedKey,
		256,
	);

	const encodedKey = hexEncode(new Uint8Array(generatedKey));
	return dec.decode(encodedKey);
}

type Props = {
	id: number;
	username: string;
	passwordSalt: string;
	passwordHash: string;
};

class User {
	id: number;
	username: string;
	passwordSalt: string;
	passwordHash: string;

	constructor(props: Props) {
		this.id = props.id;
		this.username = props.username;
		this.passwordSalt = props.passwordSalt;
		this.passwordHash = props.passwordHash;
	}

	toJSON() {
		return {
			id: this.id,
			username: this.username,
		};
	}

	async save(): Promise<void> {
		const db = await openDB();
		await db
			.query(
				`insert or
         replace
         into users(id,
                    username,
                    password_salt,
                    password_hash)
         values (?, ?, ?, ?)`,
				[
					this.id,
					this.username,
					this.passwordSalt,
					this.passwordHash,
				],
			);
	}

	static async create(
		username: string,
		password: string,
	): Promise<User> {
		const passwordSalt = buf2hex(
			crypto.getRandomValues(new Uint8Array(32)),
		);
		const passwordHash = await pbkdf2(password, passwordSalt);

		const db = await openDB();
		await db.queryEntries(
			`insert into users(username,
                         password_salt,
                         password_hash)
       values (?, ?, ?)`,
			[
				username,
				passwordSalt,
				passwordHash,
			],
		);

		return new User({
			id: db.lastInsertRowId ?? 0,
			username,
			passwordSalt,
			passwordHash,
		});
	}

	static async getByID(id: number): Promise<User | null> {
		const db = await openDB();
		const rows = await db.queryEntries<Props>(
			`select id, username, password_salt as passwordSalt, password_hash as passwordHash
       from users
       where id = ?`,
			[id],
		);

		return rows.length ? new User(rows[0]) : null;
	}

	static async getByUsername(username: string): Promise<User | null> {
		const db = await openDB();
		const rows = await db.queryEntries<Props>(
			`select id, username, password_salt as passwordSalt, password_hash as passwordHash
       from users
       where username = ?`,
			[username],
		);

		return rows.length ? new User(rows[0]) : null;
	}

	static async getAll(): Promise<User[]> {
		const db = await openDB();
		const rows = await db.queryEntries<Props>(
			`select id, username, password_salt as passwordSalt, password_hash as passwordHash
       from users`,
		);

		return rows.map<User>((r) => new User(r));
	}

	async verifyPassword(password: string): Promise<boolean> {
		return this.passwordHash ===
			(await pbkdf2(password, this.passwordSalt));
	}

	async setPassword(password: string): Promise<void> {
		this.passwordSalt = buf2hex(crypto.getRandomValues(new Uint8Array(32)));
		this.passwordHash = await pbkdf2(password, this.passwordSalt);
	}

	async delete(): Promise<void> {
		const db = await openDB();
		await db.queryEntries(
			`delete
       from users
       where id = ?`,
			[this.id],
		);
	}
}

export default User;
