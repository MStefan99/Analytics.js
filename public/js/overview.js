'use strict';

import Jui from '/js/jui.js';


(() => {
	function svgElement(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}


	function maxUsers(sessions) {
		const users = [];

		for (const key of Object.keys(sessions)) {
			users.push(sessions[key]);
		}

		return Math.max(...users);
	}


	const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;


	const sessionLength = 60 * 1000;
	const websiteID = window.location.href.match(/[0-9a-fA-f\-]+(?:\?.*)?$/);
	const scriptLocation = new URL(import.meta.url);
	const analyticsLocation = scriptLocation.host;
	const activeUsersElement = new Jui('#active-users');


	fetch('//' + analyticsLocation + '/api/stats/realtime/' + websiteID, {})
		.then(res => {
			if (~~(res.status / 100) === 2) {
				return res.json();
			} else {
				return Promise.reject('Request failed');
			}
		})
		.then(json => {
			activeUsersElement.text(json.currentUsers);

			const realtimeSvg = new Jui('#active-users-timeline-svg');
			const svgRect = realtimeSvg.nodes[0].viewBox.baseVal;
			const pagesTable = new Jui('#pages-table');

			const max = maxUsers(json.sessions) || 1;
			const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 29;

			for (let i = 0; i < 30; ++i) {
				if (json.sessions[startTime + sessionLength * i]) {
					const sessionCount = json.sessions[startTime + sessionLength * i];
					const height = map(sessionCount, 0, max, 0, 100);

					new Jui(svgElement('rect'))
						.addClass('sessions-bar')
						.attr('x', i * 7)
						.attr('y', svgRect.height - height)
						.attr('width', 6)
						.attr('height', height - 2)
						.on('mouseover', e => {
							new Jui(document.createElement('div'))
								.addClass('popup')
								.css('left', e.clientX + 'px')
								.css('top', e.clientY + 'px')
								.css('pointer-events', 'none')
								.append(new Jui(`
									<span>${29 - i} minutes ago</span>
									<br>
									<span>${sessionCount} sessions</span>
								`))
								.appendTo(new Jui('main'));
						})
						.on('mouseout', e => {
							new Jui('.popup')
								.remove();
						})
						.appendTo(realtimeSvg);
				}
			}

			for (const page of Object.keys(json.pages)) {
				let pageAddress = page.replace(/https?:\/\/.*?\//, '/');
				if (pageAddress.length > 40) {
					pageAddress = pageAddress.substr(0, 15) + '...'
						+ pageAddress.substr(pageAddress.length - 5, 5);
				}

				new Jui(document.createElement('tr'))
					.append(new Jui(`
						<td>
							<a href='${page}'>
								${pageAddress}
							</a>
						</td>
					`))
					.append(new Jui(document.createElement('td'))
						.text(json.pages[page]))
					.appendTo(pagesTable);
			}
		})
		.catch(err => {
			activeUsersElement.text('Unavailable');
		});

	fetch('//' + analyticsLocation + '/api/stats/today/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			const userCountElement = new Jui('#today-users');
			const sessionCountElement = new Jui('#today-sessions');
			const bounceRateElement = new Jui('#bounce-rate');
			const sessionDurationElement = new Jui('#session-duration');
			const avgDuration = json.sessions.reduce((a, s) => a + s.duration, 0) / json.sessions.length;

			userCountElement.text(json.users.length);
			sessionCountElement.text(json.sessions.length);
			bounceRateElement.text(Math.floor(json.bounceRate * 100) + '%');
			sessionDurationElement.text(Math.floor(avgDuration / 60 / 1000 % 60) + 'm ' +
				Math.floor(avgDuration / 1000 % 60) + 's');
		});
})();
