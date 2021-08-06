'use strict';

const path = require('path');
const fs = require('fs');

const configurer = require('@mstefan99/configurer');


const sessionDuration = 3600000;
const dayLength = 86400000;


fs.readdir(path.resolve('../../data/hits'), (err, files) => {
	for (const websiteID of files) {
		configurer(path.resolve('../../data/hits', websiteID)).load().then(data => {
			configurer(path.resolve('../../data/archive/' + websiteID)).load().then(archive => {
				for (const day of Object.keys(archive)) {
					delete archive[day];
				}

				for (const userID of Object.keys(data)) {
					const requests = data[userID].requests;
					for (let i = 1; i < requests.length; ++i) {
						const session = {
							duration: 0,
							time: 0,
							requests: []
						};
						session.time = requests[0].time;
						while (i < requests.length && requests[i].time - requests[i - 1].time < sessionDuration) {
							session.duration += requests[i].time - requests[i - 1].time;
							session.requests.push(requests[i]);
							++i;
						}

						const day = session.time - (session.time % dayLength);
						if (!archive[day]) {
							archive[day] = {
								sessions: 0,
								urls: {},
								referrers: {}
							};
						}

						++archive[day].sessions;
						for (const request of session.requests) {
							if (!archive[day].urls[request.url]) {
								archive[day].urls[request.url] = 1;
							} else {
								++archive[day].urls[request.url];
							}

							if (!archive[day].referrers[request.referrer]) {
								archive[day].referrers[request.referrer] = 1;
							} else {
								++archive[day].referrers[request.referrer];
							}
						}
					}
				}
				archive.save();
			});
		});
	}
});
