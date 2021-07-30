'use strict';

const path = require('path');
const crypto = require('crypto');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const smartConfig = require('@mstefan99/smart-config');

let data;
smartConfig('./data/data.txt').then(d => {
	data = d;
});
const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());


app.get('/A.js', (req, res) => {
	res.sendFile(path.resolve('./public/js/A.js'));
});


app.post(['/hit', '/tag'], (req, res) => {
	if (!req.body.id) {
		res.status(422).send('No ID');
		return;
	}
	let session = req.body.ajsSession;
	const id = req.body.id;
	
	delete req.body.ajsSession;
	delete req.body.id;

	if (!data.requests) {
		data.requests = {};
	}
	if (!data.requests[id]) {
		data.requests[id] = {};
	}
	if (!session) {
		const uuid = crypto.randomUUID();
		session = uuid;
	}

	if (!data.requests[id][session]) {
		data.requests[id][session] = [];
	}
	const requestInfo = {
		ip: req.ip,
		ua: req.get('user-agent'),
		lang: req.get('accept-language'),
		time: Date.now(),
		cookies: req.cookies
	};
	Object.assign(requestInfo, req.body);
	data.requests[id][session].push(requestInfo);

	res.json({session: session});
});


app.listen(process.env.PORT ?? 3000, () => {
	console.log('Listening on port', process.env.PORT ?? 3000);
});
