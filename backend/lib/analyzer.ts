'use strict';

import App from './app.ts';

const divisionLength = 1000 * 60;

type Page = { url: string; referrer: string | null; time: number };
type Session = { id: string; duration: number; ua: string; pages: Page[] };

export type Overview = {
	users: { [key: string]: number };
	views: { [key: string]: number };
	serverLogs: { [key: string]: { [key: string]: number } };
	clientLogs: { [key: string]: { [key: string]: number } };
};

export type RealtimeAudience = {
	users: { [key: string]: number };
	views: { [key: string]: number };
};

export type DayAudience = {
	users: number;
	sessions: Session[];
	bounceRate: number;
	avgDuration: number;
	views: number;
	pages: { [key: string]: number };
	referrers: { [key: string]: number };
};

export type AudienceAggregate = {
	users: { [key: string]: number };
	views: { [key: string]: number };
};

export type LogAggregate = { [key: number]: { [key: number]: number } };

export async function overview(
	appID: App['id'],
	timePeriod: number,
): Promise<Overview | null> {
	const userSets: { [key: string]: Set<string> } = {};
	const views: Overview['views'] = {};
	const serverLogs: Overview['serverLogs'] = {};
	const clientLogs: Overview['clientLogs'] = {};

	const now = Date.now();
	const startTime = now - timePeriod;

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const hits = await app.getHits(startTime, now);
	const serverLogsRaw = await app.getServerLogs(startTime, now);
	const clientLogsRaw = await app.getClientLogs(startTime, now);

	for (const hit of hits) {
		const timeSlot = now -
			Math.floor((now - hit.time) / divisionLength) * divisionLength;

		if (!userSets[timeSlot]) {
			userSets[timeSlot] = new Set([hit.clientID]);
		} else {
			!userSets[timeSlot].has(hit.clientID) &&
				userSets[timeSlot].add(hit.clientID);
		}

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
		users: Object.keys(userSets).reduce<Overview['users']>(
			(u, c) => ({ ...u, [c]: userSets[c].size }),
			{},
		),
		views,
		serverLogs,
		clientLogs,
	};
}

export async function audienceRealtime(
	appID: App['id'],
	timePeriod: number,
): Promise<RealtimeAudience | null> {
	const userSets: { [key: string]: Set<string> } = {};
	const views: RealtimeAudience['views'] = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const now = Date.now();
	const startTime = now - timePeriod;
	const hits = await app.getHits(startTime, now);

	for (const hit of hits) {
		const timeSlot = now -
			Math.floor((now - hit.time) / divisionLength) * divisionLength;

		if (!userSets[timeSlot]) {
			userSets[timeSlot] = new Set([hit.clientID]);
		} else {
			!userSets[timeSlot].has(hit.clientID) &&
				userSets[timeSlot].add(hit.clientID);
		}

		views[timeSlot] = 1 + (views[timeSlot] || 0);
	}

	return {
		users: Object.keys(userSets).reduce<Overview['users']>(
			(u, c) => ({ ...u, [c]: userSets[c].size }),
			{},
		),
		views,
	};
}

export async function audienceDetailed(
	appID: App['id'],
	sessionLength: number,
	startTime: number,
	endTime: number = Date.now(),
): Promise<DayAudience | null> {
	const sessionSets = new Map<string, Session[]>();
	const clients = new Set<string>();
	let sessionCount = 0;
	let bounced = 0;
	const pages: DayAudience['pages'] = {};
	const referrers: DayAudience['referrers'] = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const hits = await app.getHits(startTime, endTime);

	for (const hit of hits) {
		if (!clients.has(hit.clientID)) {
			clients.add(hit.clientID);
		}

		pages[hit.url] = 1 + (pages[hit.url] || 0);
		hit.referrer !== null &&
			(referrers[hit.referrer] = 1 + (referrers[hit.referrer] || 0));

		if (!sessionSets.has(hit.clientID)) {
			sessionSets.set(hit.clientID, [
				{
					id: hit.clientID.slice(0, 6) + sessionCount.toString(16),
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
					id: hit.clientID.slice(0, 6) + sessionCount.toString(16),
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
			(avg, curr, i) => avg + (curr.duration - avg) / (i + 1),
			0,
		),
		views: hits.length,
		pages,
		referrers,
	};
}

export async function audienceAggregate(
	appID: App['id'],
	startTime: number,
	endTime: number = Date.now(),
): Promise<AudienceAggregate | null> {
	const users: AudienceAggregate['users'] = {};
	const views: AudienceAggregate['views'] = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const aggregates = await app.getHitAggregate(startTime, endTime);

	for (const aggregate of aggregates) {
		users[aggregate.time] = aggregate.clients;
		views[aggregate.time] = aggregate.views;
	}

	return {
		users,
		views,
	};
}

export async function logAggregate(
	appID: App['id'],
	type: 'server' | 'client',
	startTime: number,
	endTime: number = Date.now(),
): Promise<LogAggregate | null> {
	const logs: LogAggregate = {};

	const app = await App.getByID(appID);
	if (!app) {
		return null;
	}

	const logAggregates = type === 'server'
		? await app.getServerLogAggregate(startTime, endTime)
		: await app.getClientLogAggregate(startTime, endTime);

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
	audienceRealtime,
	audienceDetailed,
	audienceAggregate,
	logAggregate,
};
