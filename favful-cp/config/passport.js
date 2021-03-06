var passport = require('passport');
var log = require('audit-log');
var User = require('../models/user/user');
var LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use('local.signin', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, function(req, username, password, done) {

    req.checkBody('username', 'Invalid Username').notEmpty();
    req.checkBody('password', 'Invalid Password').notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        var messages = [];
        errors.forEach(function(error) {
            messages.push(error.msg);
        });
        return done(null, false, req.flash('error', messages));
    }

    User.findOne({'username': username}, function(err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            log.logEvent(username, '/', 'Sign In', '<span style="color:red">Failed</span>', 'Invalid Username', username + ' has failed to sign in due to username not registered.');
            return done(null, false, {message: 'Username is not registered'});
        }
        if (user.status === 'suspended') {
            log.logEvent(username, '/', 'Sign In', '<span style="color:red">Failed</span>', 'Suspended Account', username + ' has failed to sign in due to suspended account.');
            return done(null, false, {message: 'Your account has been suspended'});
        }
        if (!user.validPassword(password)) {
            log.logEvent(username, '/', 'Sign In', '<span style="color:red">Failed</span>', 'Invalid Password', username + ' has failed to sign in due to wrong password.');
            return done(null, false, {message: 'Invalid Password'});
        }
        log.logEvent(username, '/', 'Sign In', '<span style="color:green">Success</span>', 'Successful Signed In', username + ' has signed in.');
        return done(null, user);
    });

}));