'use strict';

const path = require('path');

const express = require('express');

const router = express.Router();


module.exports = router;

router.use('/style', express.static(path.resolve(path.dirname(require.main.filename), 'public/style')));
router.use('/js', express.static(path.resolve(path.dirname(require.main.filename), 'public/js')));


router.get('/', (req, res) => {
	res.render('home');
});
