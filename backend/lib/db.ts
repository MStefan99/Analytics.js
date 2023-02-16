import { DB } from '../deps.ts';

export async function openDB(name?: string) {
	const db = new DB(
		name?.length ? `./db/apps/${name}.sqlite` : './db/db.sqlite',
	);
	await db.execute('pragma foreign_keys = on');

	return db;
}

export async function deleteDB(name: string) {
	name.length && await Deno.remove(`./db/apps/${name}.sqlite`);
}

export default openDB;
