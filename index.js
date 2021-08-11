'use strict';

const path = require('path');

const express = require('express');

const collectRouter = require('./src/collect');
const apiRouter = require('./src/api/router');
const userRouter = require('./src/user/router');


const app = express();

app.use(collectRouter);
app.use(userRouter);
app.use('/api', apiRouter);
app.set('view engine', 'pug');
app.set('views', path.resolve('./public/views'));


app.get('*', (req, res) => {
	res.status(404).render('404');
});


app.use((err, req, res, next) => {
	res.locals.error = {
		message: err.message,
		stack: req.app.get('env') === 'development' ? err.stack : {}
	};
	console.error(err);

	res.status(err.status ?? 500);
	res.render('error');
});


app.listen(process.env.PORT ?? 3000, () => {
	console.log('Listening on port', process.env.PORT ?? 3000);
});
