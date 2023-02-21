'use strict';

const scriptLocation = new URL(import.meta.url ?? document.currentScript.href);
const serverURL = scriptLocation.host;
const audienceKey = new URLSearchParams(scriptLocation.search).get('k');

export function sendData(data = null, level = null, tag = null) {
	if (!!data && !level) {
		throw new Error('Level is required for logs');
	}

	return fetch('//' + serverURL + '/audience' + (data ? '/log' : '/hit'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({
			ccs: localStorage.getItem('crash-course-session'),
			referrer: document.referrer,
			url: window.location.href,
			...(data && { data, level, tag }),
		}),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.session) {
				localStorage.setItem('crash-course-session', data.session);
			}
		})
		.catch((err) => {
			console.warn(
				'Failed to send a hit to Crash Course! More details:',
				err,
			);
		});
}

const cc = {};
Object.defineProperty(cc, 'push', {
	writable: false,
	value: (options) => sendData(options.data),
});
window.cc = cc;
sendData();
