'use strict';

const express = require('express');

const router = express.Router();


module.exports = router;


router.get('/', (req, res) => {
	res.json({message: 'Welcome to Analyze.js API!'});
});
