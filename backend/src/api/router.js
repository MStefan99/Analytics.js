'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');

const configurer = require('@mstefan99/configurer');
const auth = require('../../lib/auth.js');
const analyzer = require('../../lib/analyzer.js');

const router = express.Router();

router.get('/', (req, res) => {
	res.json({ message: 'Welcome to Analyze.js API!' });
});

router.use(auth.getSessionMiddleware);
router.use(auth.getUserMiddleware);
router.use(auth.redirectIfNotLoggedInMiddleware);

router.get('/stats/realtime/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({ error: 'No website ID provided' });
		return;
	}
	if (!req.user.websites[req.params.websiteID]) {
		res
			.status(404)
			.json({ error: 'Website not found' });
		return;
	}

	analyzer.realtimeAudience(req.params.websiteID)
		.then((data) => res.json(data));
});

router.get('/stats/today/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({ error: 'No website ID provided' });
		return;
	}
	if (!req.user.websites[req.params.websiteID]) {
		res
			.status(404)
			.json({ error: 'Website not found' });
		return;
	}

	analyzer.todayAudience(req.params.websiteID)
		.then((data) => res.json(data));
});

router.get('/stats/history/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({ error: 'No website ID provided' });
		return;
	}
	if (!req.user.websites[req.params.websiteID]) {
		res
			.status(404)
			.json({ error: 'Website not found' });
		return;
	}

	configurer(
		path.resolve(
			path.dirname(require.main.filename),
			'data/archive',
			req.params.websiteID,
		),
	)
		.load()
		.then((data) => res.json(data));
});

router.post('/websites/', (req, res) => {
	const website = {
		id: crypto.randomUUID(),
		name: req.body.websiteName ?? 'Untitled website',
	};

	if (!req.user.websites) {
		req.user.websites = {};
	}
	req.user.websites[website.id] = website;

	res.json({ websiteID: website.id });
});

module.exports = router;
