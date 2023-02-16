import openDB from './db.ts';
import User from './user.ts';

export function init() {
	return Promise.all([initDB()]);
}

export async function initDB() {
	const db = await openDB();

	const rows = await db.query(`select name
                               from sqlite_master
                               where type = 'table'
                                 and name = 'users'`);

	if (!rows.length) {
		console.log('Initializing database');

		const sql = await Deno.readTextFile('./db/general.sql');
		await db.execute(sql);
		await User.create('admin', 'admin');
	}
}

export async function initApp(id: number) {
	const db = await openDB(id.toString());
	const sql = await Deno.readTextFile('./db/app.sql');

	db.execute(sql);
}
