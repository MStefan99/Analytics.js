import { DB } from '../deps.ts';

async function openDB(path = './db/db.sqlite') {
	const db = new DB(path);
	await db.execute('pragma foreign_keys = on');

	return db;
}

export default openDB;
