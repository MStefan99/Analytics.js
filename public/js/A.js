'use strict';

// A.js - main file for Analytics.js, add this to your website to enable analytics.


(async () => {
	const scriptLocation = new URL(document.currentScript.src);
	const params = new URLSearchParams(scriptLocation.search);
	const ajs = {};

	const analyticsLocation = scriptLocation.host;
	const websiteID = params.get('ajsID');


	function sendData(path, tag, data) {
		return fetch('//' + analyticsLocation + path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: websiteID,
				ajsSession: localStorage.getItem('ajsSession'),
				tag: tag?.toString(),
				referrer: document.referrer,
				url: window.location.href,
				data: data
			})
		});
	}


	Object.defineProperty(ajs, 'tag', {
		writable: false,
		value: (tag, data) => sendData('/tag', tag, data)
	});
	window.ajs = ajs;


	sendData('/hit')
		.then(res => res.json())
		.then(json => {
			if (json.session) {
				localStorage.setItem('ajsSession', json.session);
			}
		});
})();
