'use strict';

// A.js - main file for Analytics.js, add this to your website to enable analytics.


(async () => {
	const scriptLocation = new URL(document.currentScript.src);
	const params = new URLSearchParams(scriptLocation.search);
	const aTag = {};

	const analyticsLocation = scriptLocation.host;
	const websiteID = params.get('_awid');


	Object.defineProperty(aTag, 'tag', {
		writable: false,
		value: async function (tag, data) {
			fetch('//' + analyticsLocation + '/tag', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({tag: tag, data: data})
			});
		}
	});
	window.aTag = aTag;


	fetch('//' + analyticsLocation + '/hit', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id: websiteID,
			url: window.location.href,
			referrer: document.referrer
		})
	});
})();
