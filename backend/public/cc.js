'use strict';

const scriptLocation = new URL(import.meta.url);
const serverURL = scriptLocation.origin +
	scriptLocation.pathname.replace(/\/cc$/, '');
const audienceKey = new URLSearchParams(scriptLocation.search).get('k');

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
	if (typeof message !== 'string' || typeof level !== 'number') {
		throw new Error('Please provide both message and level to send');
	}
	if (!tag) {
		tag = null;
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

export function sendFeedback(message) {
	if (typeof message !== 'string') {
		throw new Error('Please provide message to send');
	}

	return fetch(serverURL + '/audience/feedback', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({ message }),
	})
		.then(() => true)
		.catch((err) => {
			console.warn(
				'Failed to send feedback to Crash Course! More details:',
				err,
			);
			return err;
		});
}

addEventListener('error', (e) => {
	sendLog(
		e.error?.stack ?? JSON.stringify(e.error),
		3,
	); // Promise is always resolved
	return false;
});

addEventListener('unhandledrejection', (e) => {
	sendLog(
		e.reason?.stack ?? JSON.stringify(e.reason),
		3,
	); // Promise is always resolved
	return false;
});

export default {
	sendHit,
	sendLog,
	sendFeedback,
};
