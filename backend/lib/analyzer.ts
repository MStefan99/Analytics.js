'use strict';

import App from './app.ts';

const divisionLength = 1000 * 60;
const defaultSessionLength = 1000 * 60 * 30;
const defaultRealtimeRange = 1000 * 60 * 30;
const defaultHistoryRange = 1000 * 60 * 60 * 24 * 30;

type Page = { url: string; referrer: string | null; time: number };
type Session = { duration: number; ua: string; pages: Page[] };

export type RealtimeMetrics = {
	currentUsers: number;
	views: { [key: number]: number };
	serverLogs: { [key: number]: { [key: number]: number } };
	clientLogs: { [key: number]: { [key: number]: number } };
};

export type RealtimeAudience = {
	currentUsers: number;
	pages: { [key: string]: number };
	sessions: { [key: number]: number };
	referrers: { [key: string]: number };
};

export type DayAudience = {
	bounceRate: number;
	avgDuration: number;
	users: number;
	sessions: Session[];
};

export type HistoricalAudience = {
	clients: { [key: number]: number };
	views: { [key: number]: number };
};

export type HistoricalLogs = {
	serverLogs: { [key: number]: { [key: number]: number } };
	clientLogs: { [key: number]: { [key: number]: number } };
};

export async function realtimeMetrics(
	appID: App['id'],
	timeRange: number = defaultRealtimeRange,
): Promise<RealtimeMetrics | null> {
	const views: RealtimeMetrics['views'] = {};
	const serverLogs: RealtimeMetrics['serverLogs'] = {};
	const clientLogs: RealtimeMetrics['clientLogs'] = {};
	const currentUsers = new Set<string>();

	const now = Date.now();
	const startTime = Date.now() - timeRange;

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const hits = await app.getHits(startTime);
	const serverLogsRaw = await app.getServerLogs(startTime);
	const clientLogsRaw = await app.getClientLogs(startTime);

	for (const hit of hits) {
		const timeSlot = now -
			Math.floor((now - hit.time) / divisionLength) * divisionLength;

		if (
			Date.now() - hit.time < divisionLength &&
			!currentUsers.has(hit.clientID)
		) {
			currentUsers.add(hit.clientID);
		}

		views[timeSlot] = 1 +
			(views[timeSlot] || 0);
	}

	for (const serverLog of serverLogsRaw) {
		const timeSlot = now -
			Math.floor((now - serverLog.time) / divisionLength) *
				divisionLength;

		if (serverLogs[serverLog.level]) {
			serverLogs[serverLog.level][timeSlot] = 1 +
				(serverLogs[serverLog.level][timeSlot] ?? 0);
		} else {
			serverLogs[serverLog.level] = { [timeSlot]: 1 };
		}
	}

	for (const clientLog of clientLogsRaw) {
		const timeSlot = now -
			Math.floor((now - clientLog.time) / divisionLength) *
				divisionLength;

		if (clientLogs[clientLog.level]) {
			clientLogs[clientLog.level][timeSlot] = 1 +
				(clientLogs[clientLog.level][timeSlot] ?? 0);
		} else {
			clientLogs[clientLog.level] = { [timeSlot]: 1 };
		}
	}

	return {
		currentUsers: currentUsers.size,
		views,
		serverLogs,
		clientLogs,
	};
}

export async function realtimeAudience(
	appID: App['id'],
	length: number = defaultRealtimeRange,
): Promise<RealtimeAudience | null> {
	const currentUsers = new Set<string>();
	const pages: RealtimeAudience['pages'] = {};
	const sessions: RealtimeAudience['sessions'] = {};
	const referrers: RealtimeAudience['referrers'] = {};

	const now = Date.now();
	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const hits = await app.getHits(
		Date.now() - length,
	);

	for (const hit of hits) {
		if (
			Date.now() - hit.time < divisionLength &&
			!currentUsers.has(hit.clientID)
		) {
			currentUsers.add(hit.clientID);
		}

		const sessionTime = now -
			Math.floor((now - hit.time) / divisionLength) * divisionLength;
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
}

export async function todayAudience(
	appID: App['id'],
	sessionLength: number = defaultSessionLength,
): Promise<DayAudience | null> {
	const today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);

	const sessionSets = new Map<string, Session[]>();
	const clients = new Set<string>();
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
		if (!clients.has(hit.clientID)) {
			clients.add(hit.clientID);
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
		users: clients.size,
		sessions,
	};
}

export async function historyAudience(
	appID: App['id'],
	timeRange: number = defaultHistoryRange,
	endTime: number = Date.now(),
): Promise<HistoricalAudience | null> {
	const clients: HistoricalAudience['clients'] = {};
	const views: HistoricalAudience['views'] = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const aggregates = await app.getHitAggregates(
		endTime - timeRange,
		endTime,
	);

	for (const aggregate of aggregates) {
		clients[aggregate.time] = aggregate.clients;
		views[aggregate.time] = aggregate.views;
	}

	return {
		clients,
		views,
	};
}

export async function historyLogs(
	appID: App['id'],
	timeRange: number = defaultHistoryRange,
	endTime: number = Date.now(),
): Promise<HistoricalLogs | null> {
	const serverLogs: HistoricalLogs['serverLogs'] = {};
	const clientLogs: HistoricalLogs['clientLogs'] = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const serverLogAggregates = await app.getServerLogAggregates(
		endTime - timeRange,
		endTime,
	);
	const clientLogAggregates = await app.getClientLogAggregates(
		endTime - timeRange,
		endTime,
	);

	for (const aggregate of serverLogAggregates) {
		if (!serverLogs[aggregate.level]) {
			serverLogs[aggregate.level] = {};
		}

		serverLogs[aggregate.level][aggregate.time] = aggregate.count;
	}

	for (const aggregate of clientLogAggregates) {
		if (!serverLogs[aggregate.level]) {
			serverLogs[aggregate.level] = {};
		}

		serverLogs[aggregate.level][aggregate.time] = aggregate.count;
	}

	return {
		serverLogs,
		clientLogs,
	};
}

export default {
	realtimeMetrics,
	realtimeAudience,
	todayAudience,
	historyAudience,
	historyLogs,
};
