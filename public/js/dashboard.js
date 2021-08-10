'use strict';


import Jui from '/js/jui.js';

(() => {
	function svgElement(tag) {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}


	const websiteID = 'Analytics';

	const scriptLocation = new URL(import.meta.url);
	const analyticsLocation = scriptLocation.host;

	fetch('//' + analyticsLocation + '/api/stats/realtime/' + websiteID, {})
		.then(res => res.json())
		.then(json => {
			const activeUsersElement = document.getElementById('active-users');
			activeUsersElement.innerText = json.currentUsers;

			const realtimeSvg = new Jui('#active-users-timeline-svg');

			new Jui(svgElement('rect'))
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', 20)
				.attr('height', 20)
				.appendTo(realtimeSvg);
		});
})();
