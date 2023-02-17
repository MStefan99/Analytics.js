'use strict';

(() => {
	const scriptLocation = new URL(document.currentScript.src);
	const params = new URLSearchParams(scriptLocation.search);
	const cc = {};

	const serverURL = scriptLocation.host;
	const websiteID = params.get('c');

	function sendData(path, tag, data) {
		return fetch('//' + serverURL + path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: websiteID,
				ajsSession: localStorage.getItem('ajsSession'),
				tag: tag?.toString(),
				referrer: document.referrer,
				url: window.location.href,
				data: data,
			}),
		});
	}

	Object.defineProperty(cc, 'push', {
		writable: false,
		value: (options) => sendData('/tag', options.tag, options.data),
	});
	window.cc = cc;

	sendData('/hit')
		.then((res) => res.json())
		.then((json) => {
			if (json.session) {
				localStorage.setItem('ajsSession', json.session);
			}
		})
		.catch((err) => {
			console.warn(
				'Failed to send a hit to Crash Course! More details:',
				err,
			);
		});
})();
