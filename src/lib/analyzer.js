'use strict';

const path = require('path');

const configurer = require('@mstefan99/configurer');


const sessionDuration = 60 * 60 * 1000;


module.exports = {
	getAudience: function (websiteID) {
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
					pages: []
				};
				const requests = data[userID].requests;
				for (let i = 1; i < requests.length; ++i) {
					if (requests[i].time - requests[i - 1].time < sessionDuration) {
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
			resolve({
				sessions: sessions,
				users: users
			});
		}));
	}
};
