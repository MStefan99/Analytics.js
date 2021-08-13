'use strict';

const path = require('path');
const crypto = require('crypto');

const smartConfig = require('@mstefan99/smart-config');


let users;
let sessions;
smartConfig(path.resolve(path.dirname(require.main.filename),
	'data/users.json')).then(u => users = u);
smartConfig(path.resolve(path.dirname(require.main.filename),
	'data/sessions.json')).then(s => sessions = s);


module.exports = {
	getSessionMiddleware: function (req, res, next) {
		if (req.cookies.ajsSession) {
			req.session = sessions[req.cookies.ajsSession];
		}
		next();
	},


	getUserMiddleware: function (req, res, next) {
		if (req.session) {
			req.user = users[req.session?.userID];
			res.locals.user = {
				username: req.user.username
			};
		}
		next();
	},


	redirectIfNotLoggedInMiddleware: function (req, res, next) {
		if (!req.session) {
			res.redirect(303, '/login');
		} else {
			next();
		}
	},


	createUser: function (username, options) {
		const user = {
			username: username,
			id: crypto.randomUUID(),
			websites: {}
		};
		if (options.password) {
			user.passwordHash = crypto
				.createHmac('sha256', username)
				.update(options.password)
				.digest('base64');
		}

		users[user.id] = user;
		return user;
	},


	getUser: function (userID) {
		return users[userID];
	},


	findUserByUsername: function (username) {
		return users[Object.keys(users).find(id => users[id].username === username)];
	},


	setUserPassword(userID, password) {
		const user = users[userID];
		user.passwordHash = crypto
			.createHmac('sha256', user.username)
			.update(password)
			.digest('base64');
	},


	verifyUserPassword(userID, password) {
		const user = users[userID];
		return user.passwordHash === crypto
			.createHmac('sha256', user.username)
			.update(password)
			.digest('base64');
	},


	createSession: function (userID, options) {
		if (users[userID]) {
			const session = {
				userID: userID,
				id: crypto.randomUUID()
			};

			sessions[session.id] = session;
			return session;
		} else {
			return null;
		}
	},


	getSession: function (sessionID) {
		return sessions[sessionID];
	},


	deleteSession: function (sessionID) {
		delete sessions[sessionID];
	}
};
