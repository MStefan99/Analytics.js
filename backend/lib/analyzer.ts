'use strict';

import App from './app.ts';

const divisionLength = 1000 * 60;
const defaultSessionLength = 1000 * 60 * 30;
const defaultRealtimeRange = 1000 * 60 * 31; // 0 through 30 minutes ago
const defaultHistoryRange = 1000 * 60 * 60 * 24 * 91; // 0 through 90 days ago

type Page = { url: string; referrer: string | null; time: number };
type Session = { duration: number; ua: string; pages: Page[] };

export type Overview = {
	users: { [key: number]: number };
	views: { [key: number]: number };
	serverLogs: { [key: number]: { [key: number]: number } };
	clientLogs: { [key: number]: { [key: number]: number } };
};

export type RealtimeAudience = {
	users: { [key: string]: number };
	pages: { [key: string]: number };
	sessions: { [key: number]: number };
	referrers: { [key: string]: number };
};

export type DayAudience = {
	users: number;
	sessions: Session[];
	bounceRate: number;
	avgDuration: number;
	views: number;
};

export type HistoricalAudience = {
	clients: { [key: number]: number };
	views: { [key: number]: number };
};

export type HistoricalLogs = { [key: number]: { [key: number]: number } };

export async function overview(
	appID: App['id'],
	timeRange: number = defaultRealtimeRange,
): Promise<Overview | null> {
	const users: Overview['users'] = {};
	const views: Overview['views'] = {};
	const serverLogs: Overview['serverLogs'] = {};
	const clientLogs: Overview['clientLogs'] = {};

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

		users[timeSlot] = 1 + (users[timeSlot] || 0);
		views[timeSlot] = 1 + (views[timeSlot] || 0);
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
		users,
		views,
		serverLogs,
		clientLogs,
	};
}

export async function realtimeAudience(
	appID: App['id'],
	length: number = defaultRealtimeRange,
): Promise<RealtimeAudience | null> {
	const users: RealtimeAudience['users'] = {};
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
		const sessionTime = now -
			Math.floor((now - hit.time) / divisionLength) * divisionLength;
		users[sessionTime] = 1 + (users[sessionTime] ?? 0);
		sessions[sessionTime] = 1 + (sessions[sessionTime] || 0);
		pages[hit.url] = 1 + (pages[hit.url] || 0);

		if (hit.referrer !== null) {
			referrers[hit.referrer] = 1 + (referrers[hit.referrer] || 0);
		}
	}

	return {
		users,
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
		users: clients.size,
		sessions,
		bounceRate: sessionCount ? bounced / sessionCount : 0,
		avgDuration: sessions.reduce(
			(avg, curr, i) => (avg + curr.duration) / (i + 1),
			0,
		),
		views: hits.length,
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
	type: 'server' | 'client',
	timeRange: number = defaultHistoryRange,
	endTime: number = Date.now(),
): Promise<HistoricalLogs | null> {
	const logs: HistoricalLogs = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const logAggregates = type === 'server'
		? await app.getServerLogAggregates(
			endTime - timeRange,
			endTime,
		)
		: await app.getClientLogAggregates(
			endTime - timeRange,
			endTime,
		);

	for (const aggregate of logAggregates) {
		if (!logs[aggregate.level]) {
			logs[aggregate.level] = {};
		}

		logs[aggregate.level][aggregate.time] = aggregate.count;
	}

	return logs;
}

export default {
	overview,
	realtimeAudience,
	todayAudience,
	historyAudience,
	historyLogs,
};
