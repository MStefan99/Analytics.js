'use strict';

(() => {
	const websiteID = 'Analytics';

	const scriptLocation = new URL(document.currentScript.src);
	const analyticsLocation = scriptLocation.host;

	fetch('//' + analyticsLocation + '/api/stats/realtime/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			const element = document.getElementById('audience-realtime');
			element.innerText = JSON.stringify(json, null, 2);
		});

	fetch('//' + analyticsLocation + '/api/stats/today/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			const element = document.getElementById('audience-today');
			element.innerText = JSON.stringify(json, null, 2);
		});

	fetch('//' + analyticsLocation + '/api/stats/history/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			const element = document.getElementById('audience-history');
			element.innerText = JSON.stringify(json, null, 2);
		});
})();
