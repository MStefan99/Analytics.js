'use strict';

const path = require('path');

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

app.get('/A.js', (req, res) => {
	res.sendFile(path.resolve('./public/js/A.js'));
});


app.post(['/hit', '/tag'], (req, res) => {
	const requestInfo = {
		ip: req.ip,
		ua: req.get('user-agent'),
		lang: req.get('accept-language'),
		cookies: req.cookies
	};
	Object.assign(requestInfo, req.body);

	console.log(requestInfo);
	res.send('OK');
});


app.listen(process.env.PORT ?? 3000, () => {
	console.log('Listening on port', process.env.PORT ?? 3000);
});
