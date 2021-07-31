'use strict';

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');

const auth = require('../lib/auth');

const router = express.Router();

router.use('/style', express.static(path.resolve(path.dirname(require.main.filename), 'public/style')));
router.use('/js', express.static(path.resolve(path.dirname(require.main.filename), 'public/js')));
router.use(bodyParser.urlencoded({extended: true}));


router.get('/', (req, res) => {
	res.render('home');
});


router.get('/signup', (req, res) => {
	res.render('signup');
});


router.get('/login', (req, res) => {
	res.render('login');
});


router.post('/signup', (req, res) => {
	if (!req.body.username) {
		res.status(422).send('No username');
		return;
	} else if (!req.body.password) {
		res.status(422).send('No password');
		return;
	}
	// TODO: check password

	const user = auth.createUser(req.body.username, req.body.password);
	const session = auth.createSession(user.id);

	res
		.cookie('ajsSession', session.id, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: 'strict'
		})
		.redirect(303, '/dashboard');
});


router.post('/login', (req, res) => {
	if (!req.body.username) {
		res.status(422).send('No username');
		return;
	} else if (!req.body.password) {
		res.status(422).send('No password');
		return;
	}
	// TODO: check password

	const user = auth.findUserByUsername(req.body.username);
	if (!user) {
		res.status(400).send('No user');
		return;
	}

	const session = auth.createSession(user.id);
	res
		.cookie('ajsSession', session.id, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: 'strict'
		})
		.redirect(303, '/dashboard');
});


router.use(auth.getSessionMiddleware);
router.use(auth.getUserMiddleware);


router.get('/dashboard', (req, res) => {
	res.render('dashboard');
});


router.get('/logout', (req, res) => {
	auth.deleteSession(req.session.id);
	res.redirect(303, '/');
});


module.exports = router;
