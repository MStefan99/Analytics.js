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
	const websiteID = 'Analytics';
	const scriptLocation = new URL(import.meta.url);
	const analyticsLocation = scriptLocation.host;

	fetch('//' + analyticsLocation + '/api/stats/realtime/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			console.log(json);

			const activeUsersElement = document.getElementById('active-users');
			activeUsersElement.innerText = json.currentUsers;

			const realtimeSvg = new Jui('#active-users-timeline-svg');
			const svgRect = realtimeSvg.nodes[0].viewBox.baseVal;

			const max = maxUsers(json.sessions);
			const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 30;

			for (let i = 0; i < 30; ++i) {
				let users = 0;
				if (json.sessions[startTime + sessionLength * i]) {
					users = json.sessions[startTime + sessionLength * i];
				}
				console.log(svgRect);

				const height = map(users, 0, max, 0, 100);
				new Jui(svgElement('rect'))
					.addClass('sessions-bar')
					.attr('x', i * 7)
					.attr('y', svgRect.height - height)
					.attr('width', 6)
					.attr('height', height)
					.appendTo(realtimeSvg);
			}
		});
})();
