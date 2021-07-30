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


app.listen(process.env.PORT ?? 3000, () => {
	console.log('Listening on port', process.env.PORT ?? 3000);
});
