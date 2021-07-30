'use strict';

const path = require('path');

const express = require('express');

const auth = require('../lib/auth');

const router = express.Router();

router.use('/style', express.static(path.resolve(path.dirname(require.main.filename), 'public/style')));
router.use('/js', express.static(path.resolve(path.dirname(require.main.filename), 'public/js')));


router.get('/', (req, res) => {
	res.render('home');
});


router.get('/signup', (req, res) => {
	res.render('signup');
});


router.get('/login', (req, res) => {
	res.render('login');
});


router.use(auth.getSessionMiddleware);
router.use(auth.getUserMiddleware);


router.get('/dashboard', (req, res) => {
	res.render('dashboard');
});


router.get('/logout', (req, res) => {
	// TODO: delete session
	res.redirect(303, '/');
});


module.exports = router;
