'use strict';

const path = require('path');
const fs = require('fs');

const configurer = require('@mstefan99/configurer');
const analyzer = require('../../lib/analyzer.js');

fs.readdir(path.resolve('../../data/hits'), (err, files) => {
	for (const websiteID of files) {
		configurer(path.resolve('../../data/archive', websiteID)).load().then(
			(archive) => {
				analyzer.historyAudience(websiteID)
					.then((history) => {
						Object.assign(archive, history);
						archive.save();
					})
					.then(() => {
						configurer(path.resolve('../../data/hits', websiteID))
							.load().then((data) => {
								for (const userID of Object.keys(data)) {
									data[userID].requests = data[userID]
										.requests
										.filter((r) =>
											r.time >
												Date.now() -
													(Date.now() %
														analyzer.dayLength)
										);
									if (!data[userID].requests.length) {
										delete data[userID];
									}
									data.save();
								}
							});
					});
			},
		);
	}
});
