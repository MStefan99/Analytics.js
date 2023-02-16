'use strict';

import Jui from '/frontend/public/js/jui.js';

(() => {
	function svgElement(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}

	const map = (x1, y1, x2, y2, value) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

	const sessionLength = 60 * 1000;
	const websiteID = window.location.href.match(/[0-9a-fA-f\-]+(?:\?.*)?$/);
	const scriptLocation = new URL(import.meta.url);
	const analyticsLocation = scriptLocation.host;
	const svg = new Jui('#realtime-users-details-svg');
	const rect = svg.nodes[0].viewBox.baseVal;
	const activeUsersElement = new Jui('#active-users');
	const topPagesTable = new Jui('#top-pages');
	const topReferralsTable = new Jui('#top-referrals');
	const topLocationsTable = new Jui('#top-locations');

	fetch('//' + analyticsLocation + '/api/stats/realtime/' + websiteID, {})
		.then((res) => res.json())
		.then((json) => {
			activeUsersElement.text(json.currentUsers);
			const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 29;
			const maxSessions = Object.keys(json.sessions).reduce(
				(a, k) => Math.max(a, json.sessions[k]),
				1
			);

			for (let i = 1; i < Math.min(maxSessions, 10); ++i) {
				const mapYScale = map.bind(this, 0, Math.min(maxSessions, 10), rect.height - 5, 5);

				new Jui(svgElement('line'))
					.addClass('horizontal-line')
					.attr('x1', 0)
					.attr('y1', mapYScale(i))
					.attr('x2', rect.width)
					.attr('y2', mapYScale(i))
					.appendTo(svg);
			}

			for (let i = 1; i < 30; ++i) {
				const mapXScale = map.bind(this, 0, 29, 5, rect.width - 5);
				const mapYScale = map.bind(this, 0, maxSessions, rect.height - 5, 5);

				new Jui(svgElement('line'))
					.addClass('sessions-line')
					.attr('x1', mapXScale(i - 1))
					.attr('y1', mapYScale(json.sessions[startTime + sessionLength * (i - 1)] || 0))
					.attr('x2', mapXScale(i))
					.attr('y2', mapYScale(json.sessions[startTime + sessionLength * i] || 0))
					.appendTo(svg);

				new Jui(svgElement('circle'))
					.addClass('sessions-dot')
					.attr('cx', mapXScale(i))
					.attr('cy', mapYScale(json.sessions[startTime + sessionLength * i] || 0))
					.attr('r', 2)
					.on('mouseover', (e) => {
						new Jui(document.createElement('div'))
							.addClass('popup')
							.css('left', e.clientX + 'px')
							.css('top', e.clientY + 'px')
							.css('pointer-events', 'none')
							.append(
								new Jui(`
									<span>${29 - i} minutes ago</span>
									<br>
									<span>${json.sessions[startTime + sessionLength * i] || 0} sessions</span>
								`)
							)
							.appendTo(new Jui('main'));
					})
					.on('mouseout', (e) => {
						new Jui('.popup').remove();
					})
					.appendTo(svg);
			}

			for (const page of Object.keys(json.pages)
				.sort((a, b) => json.pages[b] - json.pages[a])
				.slice(0, 15)) {
				let pageAddress = page.replace(/https?:\/\/.*?\//, '/');

				new Jui(document.createElement('tr'))
					.append(
						new Jui(`
						<td>
							<a href='${page}' target="_blank">
								${pageAddress}
							</a>
						</td>
					`)
					)
					.append(new Jui(document.createElement('td')).text(json.pages[page]))
					.appendTo(topPagesTable);
			}

			for (const referral of Object.keys(json.referrers)
				.sort((a, b) => json.referrers[b] - json.referrers[a])
				.slice(0, 15)) {
				new Jui(document.createElement('tr'))
					.append(
						new Jui(`
						<td>
							<a href="${referral}">
								${referral}
							</a>
						</td>`)
					)
					.append(new Jui(document.createElement('td')).text(json.referrers[referral]))
					.appendTo(topReferralsTable);
			}
		});
}).call(window);
