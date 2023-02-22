'use strict';

import openDB from './db.ts';

const divisionLength = 1000 * 60;
const sessionLength = 1000 * 60 * 30;

type Page = { url: string; referrer?: string; time: number };
type Session = { duration: number; ua: string; ip: string; pages: Page[] };

export default {
	metricsOverview: async function (appID: number) {
		const sessions: { [key: number]: number } = {};
		const clientLogs: { [key: number]: { [key: number]: number } } = {};
		const serverLogs: { [key: number]: { [key: number]: number } } = {};

		const startTime = Date.now() - sessionLength;

		const db = await openDB(appID);
		const hits = await db.queryEntries<
			{
				url: string;
				referrer: string;
				time: number;
			}
		>(
			`select url, referrer, time
       from hits
       where hits.time > ?`,
			[startTime],
		);

		const serverRows = await db.queryEntries<
			{ time: number; level: number }
		>(
			`
        select time, level
        from server_logs
        where time > ?`,
			[startTime],
		);
		const clientRows = await db.queryEntries<
			{ time: number; level: number }
		>(
			`
        select time, level
        from client_logs
        where time > ?`,
			[startTime],
		);

		for (const hit of hits) {
			const timeSlot = hit.time -
				(hit.time % divisionLength);

			sessions[timeSlot] = 1 +
				(sessions[timeSlot] || 0);
		}

		for (const row of serverRows) {
			const timeSlot = row.time -
				(row.time % divisionLength);

			if (serverLogs[row.level]) {
				serverLogs[row.level][timeSlot] = 1 +
					(serverLogs[row.level][timeSlot] ?? 0);
			} else {
				serverLogs[row.level] = { [timeSlot]: 1 };
			}
		}

		for (const row of clientRows) {
			const timeSlot = row.time -
				(row.time % divisionLength);

			if (clientLogs[row.level]) {
				clientLogs[row.level][timeSlot] = 1 +
					(clientLogs[row.level][timeSlot] ?? 0);
			} else {
				clientLogs[row.level] = { [timeSlot]: 1 };
			}
		}

		return {
			sessions,
			clientLogs,
			serverLogs,
		};
	},

	realtimeAudience: async function (appID: number) {
		const currentUsers = new Set<string>();
		const pages: { [key: string]: number } = {};
		const sessions: { [key: number]: number } = {};
		const referrers: { [key: string]: number } = {};

		const db = await openDB(appID);
		const hits = await db.queryEntries<
			{
				id: string;
				url: string;
				referrer: string;
				time: number;
				ip: string;
				ua: string;
				lang: string;
			}
		>(
			`select id, url, referrer, time, ip, ua, lang
       from hits
                join sessions on session_id = sessions.id
       where hits.time > ?`,
			[Date.now() - sessionLength],
		);

		for (const hit of hits) {
			if (
				Date.now() - hit.time < divisionLength &&
				!currentUsers.has(hit.id)
			) {
				currentUsers.add(hit.id);
			}

			const sessionTime = hit.time -
				(hit.time % divisionLength);

			pages[hit.url] = 1 +
				(pages[hit.url] || 0);
			sessions[sessionTime] = 1 +
				(sessions[sessionTime] || 0);

			if (hit.referrer !== undefined) {
				referrers[hit.referrer] = 1 +
					(referrers[hit.referrer] || 0);
			}
		}

		return {
			currentUsers: currentUsers.size,
			pages,
			sessions,
			referrers,
		};
	},

	dayAudience: async function (appID: number) {
		const today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);

		const db = await openDB(appID);

		const sessionSets = new Map<string, Session[]>();
		const users = new Set<string>();
		let sessionCount = 0;
		let bounced = 0;

		const hits = await db.queryEntries<
			{
				id: string;
				url: string;
				referrer: string;
				time: number;
				ip: string;
				ua: string;
				lang: string;
			}
		>(
			`select id, url, referrer, time, ip, ua, lang
       from hits
                join sessions on session_id = sessions.id
       where hits.time > ?`,
			[today.getTime()],
		);

		for (const hit of hits) {
			if (!users.has(hit.id)) {
				users.add(hit.id);
			}

			if (!sessionSets.has(hit.id)) {
				sessionSets.set(hit.id, [
					{
						duration: 0,
						ua: hit.ua,
						ip: hit.ip,
						pages: [{
							url: hit.url,
							referrer: hit.referrer,
							time: hit.time,
						}],
					},
				]);
				++sessionCount;
				++bounced;
			} else {
				const set = sessionSets.get(hit.id) as Session[]; // Safe because of the check above
				const session = set[set.length - 1];
				const lastHit = session.pages[session.pages.length - 1].time;

				if (hit.time - lastHit > sessionLength) {
					set.push({
						duration: 0,
						ua: hit.ua,
						ip: hit.ip,
						pages: [{
							url: hit.url,
							referrer: hit.referrer,
							time: hit.time,
						}],
					});
					++sessionCount;
					++bounced;
				} else {
					if (session.pages.length === 1) {
						--bounced;
					}
					session.duration = hit.time - session.pages[0].time;
					session.pages.push({
						url: hit.url,
						referrer: hit.referrer,
						time: hit.time,
					});
				}
			}
		}

		const sessions = Array.from(sessionSets.values()).flat();

		return {
			bounceRate: sessionCount ? bounced / sessionCount : 0,
			avgDuration: sessions.reduce(
				(avg, curr, i) => (avg + curr.duration) / (i + 1),
				0,
			),
			users: users.size,
			sessions,
		};
	},
};
