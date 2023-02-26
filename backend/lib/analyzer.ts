'use strict';

import App from './app.ts';

const divisionLength = 1000 * 60;
const sessionLength = 1000 * 60 * 30;

type Page = { url: string; referrer: string | null; time: number };
type Session = { duration: number; ua: string; pages: Page[] };

export default {
	metricsOverview: async function (appID: number) {
		const sessions: { [key: number]: number } = {};
		const clientLogs: { [key: number]: { [key: number]: number } } = {};
		const serverLogs: { [key: number]: { [key: number]: number } } = {};
		const currentUsers = new Set<string>();

		const startTime = Date.now() - sessionLength;

		const app = await App.getByID(appID);
		if (!app) {
			return null;
		}

		const hits = await app.getHits(startTime);
		const serverRows = await app.getServerLogs(startTime);
		const clientRows = await app.getClientLogs(startTime);

		for (const hit of hits) {
			const timeSlot = hit.time -
				(hit.time % divisionLength);

			if (
				Date.now() - hit.time < divisionLength &&
				!currentUsers.has(hit.clientID)
			) {
				currentUsers.add(hit.clientID);
			}

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
			currentUsers: currentUsers.size,
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

		const app = await App.getByID(appID);
		if (!app) {
			return null;
		}

		const hits = await app.getHits(
			Date.now() - sessionLength,
		);

		for (const hit of hits) {
			if (
				Date.now() - hit.time < divisionLength &&
				!currentUsers.has(hit.clientID)
			) {
				currentUsers.add(hit.clientID);
			}

			const sessionTime = hit.time -
				(hit.time % divisionLength);

			pages[hit.url] = 1 +
				(pages[hit.url] || 0);
			sessions[sessionTime] = 1 +
				(sessions[sessionTime] || 0);

			if (hit.referrer !== null) {
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

		const sessionSets = new Map<string, Session[]>();
		const users = new Set<string>();
		let sessionCount = 0;
		let bounced = 0;

		const app = await App.getByID(appID);
		if (!app) {
			return null;
		}

		const hits = await app.getHits(
			today.getTime(),
		);

		for (const hit of hits) {
			if (!users.has(hit.clientID)) {
				users.add(hit.clientID);
			}

			if (!sessionSets.has(hit.clientID)) {
				sessionSets.set(hit.clientID, [
					{
						duration: 0,
						ua: hit.ua,
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
				const set = sessionSets.get(hit.clientID) as Session[]; // Safe because of the check above
				const session = set[set.length - 1];
				const lastHit = session.pages[session.pages.length - 1].time;

				if (hit.time - lastHit > sessionLength) {
					set.push({
						duration: 0,
						ua: hit.ua,
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
