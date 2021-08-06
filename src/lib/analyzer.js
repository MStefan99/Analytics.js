'use strict';

const path = require('path');

const configurer = require('@mstefan99/configurer');


const sessionLength = 60 * 1000;
const historyLength = 30 * 60 * 1000;
const dayLength = 24 * 60 * 60 * 1000;


module.exports = {
	todayAudience: function (websiteID) {
		return new Promise(resolve => configurer(path.resolve(path.dirname(require.main.filename),
			'data/hits', websiteID)).load().then(data => {
			const sessions = [];
			const users = [];
			for (const userID of Object.keys(data)) {
				users.push({
					ua: data[userID].ua,
					lang: data[userID].lang
				});
				const session = {
					duration: 0,
					time: 0,
					pages: []
				};
				const requests = data[userID].requests.filter(r => Date.now() - r.time < dayLength);
				if (requests.length) {
					session.time = requests[0].time;
					for (let i = 1; i < requests.length; ++i) {
						if (requests[i].time - requests[i - 1].time < historyLength) {
							session.duration += requests[i].time - requests[i - 1].time;
							session.pages.push(requests[i].url);
						} else {
							sessions.push(Object.assign({}, session));
							session.duration = 0;
							session.pages = [];
						}
					}
					sessions.push(session);
				}
			}
			resolve({
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

				if (Date.now() - lastRequest.time < sessionLength) {
					++audience.currentUsers;
				}

				for (const request of data[userID].requests.filter(r => Date.now() - r.time < sessionLength)) {
					if (!audience.pages[request.url]) {
						audience.pages[request.url] = 1;
					} else {
						++audience.pages[request.url];
					}
				}

				for (const request of data[userID].requests.filter(r => Date.now() - r.time < dayLength)) {
					const sessionTime = request.time - (request.time % sessionLength);

					if (!audience.sessions[sessionTime]) {
						audience.sessions[sessionTime] = 1;
					} else {
						++audience.sessions[sessionTime];
					}
				}
			}

			resolve(audience);
		}));
	}
};
