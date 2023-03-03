import { DB } from '../deps.ts';

const dbs = new Map<string, DB>();
const dbTimeout = 1000 * 60 * 5;

export async function openDB(name?: string | number): Promise<DB> {
	const nameString = name?.toString() ?? '';

	if (dbs.has(nameString)) {
		return dbs.get(nameString) as DB; // Safe because of the check above
	} else {
		const db = new DB(
			nameString.length
				? `./db/apps/${nameString}.sqlite`
				: './db/db.sqlite',
		);
		await db.execute('pragma foreign_keys = on');

		setTimeout(() => {
			dbs.delete(nameString);
			db.close();
		}, dbTimeout);

		dbs.set(nameString, db);
		return db;
	}
}

export async function deleteDB(name: string | number) {
	const nameString = name?.toString() ?? '';

	nameString.length && await Deno.remove(`./db/apps/${nameString}.sqlite`);
}

export default openDB;
