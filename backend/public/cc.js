'use strict';

const scriptLocation = new URL(import.meta.url);
const serverURL = scriptLocation.origin +
	scriptLocation.pathname.replace(/\/cc$/, '');
console.log(serverURL);
const audienceKey = new URLSearchParams(scriptLocation.search).get('k');
const errorLevel = 3;

export function sendHit() {
	return fetch(serverURL + '/audience/hits', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({
			ccs: localStorage.getItem('crash-course-session'),
			referrer: document.referrer,
			url: window.location.href,
		}),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.session) {
				localStorage.setItem('crash-course-session', data.session);
			}
			return true;
		})
		.catch((err) => {
			console.warn(
				'Failed to send a hit to Crash Course! More details:',
				err,
			);
			return err;
		});
}

export function sendLog(message, level = 0, tag = null) {
	if (message === undefined || level === undefined) {
		throw new Error('Level is required for logs');
	}

	return fetch(serverURL + '/audience/logs', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({ message, level, tag }),
	})
		.then(() => true)
		.catch((err) => {
			console.warn(
				'Failed to send a log to Crash Course! More details:',
				err,
			);
			return err;
		});
}

for (const type of ['error', 'unhandledrejection']) {
	addEventListener(type, (e) => {
		sendLog(
			e.error?.stack ??
				'Unhandled rejection: ' + JSON.stringify(e.reason),
			errorLevel,
		); // Promise is always resolved
		return false;
	});
}

export default {
	sendHit,
	sendLog,
};
