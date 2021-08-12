'use strict';

const path = require('path');

const configurer = require('@mstefan99/configurer');


module.exports = {
	realtimeLength: 60 * 1000,
	sessionLength: 30 * 60 * 1000,
	dayLength: 24 * 60 * 60 * 1000,


	todayAudience: function (websiteID) {
		return new Promise(resolve => configurer(path.resolve(path.dirname(require.main.filename),
				'data/hits', websiteID)).load().then(data => {
			let bounced = 0;
			const sessions = [];
			const users = [];
			for (const userID of Object.keys(data)) {
				users.push({
					ua: data[userID].ua,
					lang: data[userID].lang
				});

				const requests = data[userID].requests.filter(r => Date.now() - r.time < this.dayLength);
				for (let i = 0; i < requests.length; ++i) {
					const session = {
						duration: 0,
						time: requests[i].time,
						pages: [requests[i].url]
					};

					for (let j = i + 1; j < requests.length
					&& requests[j].time - requests[j - 1].time < this.sessionLength; ++j) {
						session.duration += requests[j].time - requests[j - 1].time;
						session.pages.push(requests[j].url);
						i = j;
					}
					sessions.push(session);
					if (session.pages.length === 1) {
						++bounced;
					}
				}
			}
			resolve({
				bounceRate: bounced / sessions.length,
				avgDuration: sessions.reduce((a, s) => a + s.duration, 0) / sessions.length,
				sessions: sessions,
				users: users
			});
		}));
	},


	realtimeAudience: function (websiteID) {
		const audience = {
			currentUsers: 0,
			pages: {},
			sessions: {}
		};

		return new Promise(resolve => configurer(path.resolve(path.dirname(require.main.filename),
				'data/hits', websiteID)).load().then(data => {
			for (const userID of Object.keys(data)) {
				const lastRequest = data[userID].requests.length?
						data[userID].requests[data[userID].requests.length - 1] :
						undefined;
				const requests = data[userID].requests.filter(r => Date.now() - r.time < this.sessionLength);

				if (Date.now() - lastRequest.time < this.realtimeLength) {
					++audience.currentUsers;
				}

				for (const request of requests) {
					if (!audience.pages[request.url]) {
						audience.pages[request.url] = 1;
					} else {
						++audience.pages[request.url];
					}
				}

				for (const request of requests) {
					const sessionTime = request.time - (request.time % this.realtimeLength);

					if (!audience.sessions[sessionTime]) {
						audience.sessions[sessionTime] = 1;
					} else {
						++audience.sessions[sessionTime];
					}
				}
			}

			resolve(audience);
		}));
	},


	historyAudience: function (websiteID) {
		const archive = {};

		return new Promise(resolve => configurer(path.resolve('../../data/hits', websiteID)).load().then(data => {
			let totalTime = 0;
			for (const userID of Object.keys(data)) {
				const requests = data[userID].requests;
				for (let i = 0; i < requests.length; ++i) {
					const session = {
						duration: 0,
						time: requests[i].time,
						requests: [requests[i]]
					};
					let bounced = 0;

					for (let j = i + 1; j < requests.length
					&& requests[j].time - requests[j - 1].time < this.sessionLength; ++j) {
						session.duration += requests[j].time - requests[j - 1].time;
						session.requests.push(requests[j]);
						i = j;
					}
					if (session.requests.length === 1) {
						++bounced;
					}
					totalTime += session.duration;

					const day = session.time - (session.time % this.dayLength);
					if (!archive[day]) {
						archive[day] = {
							sessions: 0,
							urls: {},
							referrers: {}
						};
					}

					++archive[day].sessions;
					archive[day].bounceRate = bounced / archive[day].sessions;
					archive[day].avgDuration = totalTime / archive[day].sessions;
					for (const request of session.requests) {
						if (!archive[day].urls[request.url]) {
							archive[day].urls[request.url] = 1;
						} else {
							++archive[day].urls[request.url];
						}

						if (request.referrer) {
							if (!archive[day].referrers[request.referrer]) {
								archive[day].referrers[request.referrer] = 1;
							} else {
								++archive[day].referrers[request.referrer];
							}
						}
					}
				}
			}

			resolve(archive);
		}));
	}
};
