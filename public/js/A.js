'use strict';

// A.js - main file for Analytics.js, add this to your website to enable analytics.


(async () => {
	const scriptLocation = new URL(document.currentScript.src);
	const params = new URLSearchParams(scriptLocation.search);
	const aTag = {};

	const analyticsLocation = scriptLocation.host;
	const websiteID = params.get('ajsID');


	function sendData(path, data, tag) {
		return fetch('//' + analyticsLocation + path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: websiteID,
				ajsSession: localStorage.getItem('ajsSession'),
				tag: tag,
				referrer: document.referrer,
				url: window.location.href,
				data: data
			})
		});
	}


	Object.defineProperty(aTag, 'tag', {
		writable: false,
		value: (tag, data) => sendData('/tag', tag, data)
	});
	window.aTag = aTag;


	sendData('/hit')
		.then(res => res.json())
		.then(json => {
			if (json.session) {
				localStorage.setItem('ajsSession', json.session);
			}
		});
})();
