'use strict';

const path = require('path');
const express = require('express');

const configurer = require('@mstefan99/configurer');

const auth = require('../lib/auth');
const analyzer = require('../lib/analyzer');

const router = express.Router();


router.get('/', (req, res) => {
	res.json({message: 'Welcome to Analyze.js API!'});
});


router.get('/stats/realtime/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({error: 'No website ID provided'});
		return;
	}

	analyzer.realtimeAudience(req.params.websiteID)
		.then(data => res.json(data));
});


router.get('/stats/today/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({error: 'No website ID provided'});
		return;
	}

	analyzer.todayAudience(req.params.websiteID)
		.then(data => res.json(data));
});


router.get('/stats/history/:websiteID', (req, res) => {
	if (!req.params.websiteID) {
		res.status(422).json({error: 'No website ID provided'});
		return;
	}

	configurer(path.resolve(path.dirname(require.main.filename),
		'data/archive', req.params.websiteID))
		.load()
		.then(data => res.json(data));
});


module.exports = router;
