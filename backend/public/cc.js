'use strict';

const scriptLocation = new URL(import.meta.url);
const serverURL = scriptLocation.host;
const audienceKey = new URLSearchParams(scriptLocation.search).get('k');

export function sendData(tag = null, data = null) {
	return fetch('//' + serverURL + '/telemetry' + (tag ? '/tag' : '/hit'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({
			ccs: localStorage.getItem('crash-course-session'),
			referrer: document.referrer,
			url: window.location.href,
			...(tag && { tag, data }),
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
	value: (options) => sendData(options.tag, options.data),
});
window.cc = cc;
sendData();
