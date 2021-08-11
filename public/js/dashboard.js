'use strict';

import Jui from '/js/jui.js';


(() => {
	const scriptLocation = new URL(import.meta.url);
	const analyticsLocation = scriptLocation.host;
	const addButton = new Jui('.new-website-btn');
	const main = new Jui('main');

	addButton.on('click', () => {
		new Jui('.popup').remove();

		main
			.append(new Jui(`<div class="popup-backdrop"></div>`)
				.on('click', e => {
					if (e.target.classList.contains('popup-backdrop')) {
						new Jui('.popup-backdrop').remove();
					}
				})
				.append(new Jui(`<div class="popup centered"></div>`)
					.on('click')
					.append(new Jui(`
						<form>
							<h3>Add new website</h3>
							<div class="form-group">
								<label for="new-website-name">Website name</label>
								<input id="new-website-name" type="text"
								 name="websiteName" placeholder="Name">
							</div>
							<input class="btn btn-success" type="submit" value="Add">
						</form>
					`)
						.on('submit', e => {
							e.preventDefault();

							fetch('//' + analyticsLocation + '/api/websites', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									websiteName: e.target.websiteName.value
								})
							})
								.then(res => res.json())
								.then(json => {
									console.log(json);
								});
						})
					)
				)
			);
	});
})();
