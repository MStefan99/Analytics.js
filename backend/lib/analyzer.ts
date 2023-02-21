'use strict';

import openDB from './db.ts';

const realtimeLength = 60 * 1000;
const sessionLength = 30 * 60 * 1000;

export default {
	dayAudience: async function (appID: number) {
		const today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);
		today.setMilliseconds(0);

		const db = await openDB(appID);

		let bounced = 0;
		const sessions = new Array<
			{ duration: number; pages: { url: string; time: number }[] }
		>();

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

		for (let i = 0; i < hits.length; ++i) {
			const session = {
				duration: 0,
				ua: hits[i].ua,
				ip: hits[i].ip,
				pages: [{ url: hits[i].url, time: hits[i].time }],
			};

			for (
				let j = i + 1;
				j < hits.length &&
				hits[j - 1].id === hits[j].id &&
				hits[j].time - hits[j - 1].time <
					sessionLength;
				++j
			) {
				session.duration += hits[j].time -
					hits[j - 1].time;
				session.pages.push({ url: hits[j].url, time: hits[j].time });
				i = j;
			}
			sessions.push(session);
			if (session.pages.length === 1) {
				++bounced;
			}
		}

		return {
			bounceRate: bounced / sessions.length,
			avgDuration: sessions.reduce((a, s) => a + s.duration, 0) /
				sessions.length,
			sessions,
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
				Date.now() - hit.time < realtimeLength &&
				!currentUsers.has(hit.id)
			) {
				currentUsers.add(hit.id);
			}

			const sessionTime = hit.time -
				(hit.time % realtimeLength);

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
};
