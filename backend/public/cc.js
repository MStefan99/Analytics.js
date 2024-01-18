'use strict';

const scriptLocation = new URL(import.meta.url);
const serverURL = scriptLocation.origin +
	scriptLocation.pathname.replace(/\/cc$/, '');
const params = new URLSearchParams(scriptLocation.search);
const audienceKey = params.get('k');

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
		.then((res) => {
			if (!res.ok) {
				return res.json().then((json) => Promise.reject(json));
			}

			return res.json();
		})
		.then((data) => {
			if (data.session) {
				localStorage.setItem('crash-course-session', data.session);
			}
		})
		.catch((err) => {
			sendLog(
				'Failed to send a hit to Crash Course! ' + err?.stack ??
					JSON.stringify(err),
				3,
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
		.then((res) => {
			if (!res.ok) {
				return res.json().then((json) => Promise.reject(json));
			}
		})
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
		.then((res) => {
			if (!res.ok) {
				return res.json().then((json) => Promise.reject(json));
			}
		})
		.catch((err) => {
			console.warn(
				'Failed to send feedback to Crash Course! ',
				err?.stack ?? JSON.stringify(err),
			);
			return err;
		});
}

const log = [
	console.debug,
	console.log,
	console.warn,
	console.error,
];

function wrapLog(level) {
	return function (...data) {
		log[level](...data);

		return sendLog(
			data.map((d) => typeof d === 'string' ? d : JSON.stringify(d)).join(
				' ',
			),
			level,
		);
	};
}

if (params.has('verbose')) {
	console.debug = wrapLog(0);
	console.log = wrapLog(1);
	console.warn = wrapLog(2);
	console.error = wrapLog(3);
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

window.document.body.addEventListener('click', (e) => {
	const element = e.target.closest('a');
	if (!element) {
		return; // Element is not a link
	}
	if (
		!element.classList?.contains('outbound') &&
		window.location.hostname ===
			new URL(element.href, window.location.href).hostname
	) {
		return; // Element is not an outbound link
	}

	fetch(serverURL + '/audience/hits', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Audience-Key': audienceKey,
		},
		body: JSON.stringify({
			ccs: localStorage.getItem('crash-course-session'),
			referrer: 'Outbound',
			url: element.href,
		}),
		keepalive: true,
	});
});

export default {
	sendHit,
	sendLog,
	sendFeedback,
};
