'use strict';

const path = require('path');
const crypto = require('crypto');

const smartConfig = require('@mstefan99/smart-config');


let users;
let sessions;
smartConfig(path.resolve(path.dirname(require.main.filename), 'data/users')).then(u => {
	users = u;
});
smartConfig(path.resolve(path.dirname(require.main.filename), 'data/sessions')).then(s => {
	sessions = s;
});


module.exports = {
	getSessionMiddleware: function (req, res, next) {
		if (req.cookies.ajsSession) {
			req.session = sessions[req.cookies.ajsSession];
			next();
		} else {
			res.redirect(303, '/login');
		}
	},


	getUserMiddleware: function (req, res, next) {
		if (req.session) {
			req.user = users[req.session?.username];
			res.locals.user = {
				username: req.user.username
			};
			next();
		} else {
			res.redirect(303, '/login');
		}
	},


	createUser: function (username, options) {
		users[username] = {
			username: username,
			id: crypto.randomUUID()
		};
	},


	getUser: function (userID, options) {
		return users.find(u => u.id === userID);
	},


	createSession: function (userID, options) {
		if (this.getUser(userID)) {
			const session = {
				userID: userID,
				id: crypto.randomUUID()
			};

			sessions[session.id] = session;
		}
	}
};
