'use strict';

const path = require('path');
const crypto = require('crypto');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const configurer = require('@mstefan99/configurer');
const analyzer = require('../lib/analyzer');

const router = express.Router();

router.use(bodyParser.json());
router.use(cookieParser());
router.use(cors());


function saveRequest(req, fileName, session, extras) {
	configurer(path.resolve('./data', fileName)).load().then(data => {
		if (!data[session]) {
			data[session] = {
				ip: req.ip,
				ua: req.get('user-agent'),
				lang: req.get('accept-language'),
				requests: []
			};
		}

		const requestInfo = {
			time: Date.now(),
			url: req.body.url.replace(/[#?].*$/, '') ?? req.get('referer')
		};
		if (!req.body.referrer.match(new RegExp('^https?://' +
			req.body.url.replace(/https?:\/\/|\/.*/g, '')))) {
			requestInfo.referrer = req.body.referrer.replace(/[#?].*$/, '');
		}
		Object.assign(requestInfo, extras);

		data[session].requests.push(requestInfo);
		data.save();
	});
}


router.get('/A.js', (req, res) => {
	res.sendFile(path.resolve('./public/js/A.js'));
});


router.post('/hit', (req, res) => {
	if (!req.body.id) {
		res.status(400).send('No ID provided');
		return;
	}

	const session = req.body.ajsSession ?? crypto.randomUUID();
	saveRequest(req, 'hits/' + req.body.id, session);

	res.json({session: session});
});


router.post('/tag', (req, res) => {
	if (!req.body.id) {
		res.status(400).send('No ID provided');
		return;
	}

	const session = req.body.ajsSession ?? crypto.randomUUID();
	saveRequest(req, 'tags/' + req.body.id, session, {
		tag: req.body.tag,
		data: req.body.data
	});

	res.json({session: session});
});


module.exports = router;
