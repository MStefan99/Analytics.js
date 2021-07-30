'use strict';

const path = require('path');
const crypto = require('crypto');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const configurer = require('@mstefan99/configurer');

const router = express.Router();

router.use(bodyParser.json());
router.use(cookieParser());
router.use(cors());


router.get('/A.js', (req, res) => {
	res.sendFile(path.resolve('./public/js/A.js'));
});


router.post(['/hit', '/tag'], (req, res) => {
	if (!req.body.id) {
		res.status(422).send('No ID');
		return;
	}

	const session = req.body.ajsSession ?? crypto.randomUUID();
	configurer(path.resolve('./data',
		req.body.id + '.txt')).load().then(data => {
		if (!data[session]) {
			data[session] = {
				ip: req.ip,
				ua: req.get('user-agent'),
				lang: req.get('accept-language'),
				hits: []
			};
		}
		const requestInfo = {
			time: Date.now(),
			url: req.body.url ?? req.get('referer'),
			referrer: req.body.referrer,
			cookies: req.cookies,
			tag: req.body.tag,
			data: req.body.data
		};
		data[session].hits.push(requestInfo);
		data.save();
	});

	res.json({session: session});
});


module.exports = router;
