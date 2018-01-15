var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var google = require('googleapis');
var youtube = google.youtube('v3');

var Member = require('../models/member/member');
var Tutorial = require('../models/tutorial/tutorial');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', notLoggedIn, function(req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard')
    } else {
        res.render('modules/landing/index', {title: 'Creator', csrfToken: req.csrfToken()});
    }
});

router.post('/', notLoggedIn, function(req, res, next) {
    Member.findOne({email:{ $regex: new RegExp("^" + req.body.inviteemail.toLowerCase(), "i") }}, function(err, result) {
        if (result) {
            req.session.inviteemail = req.body.inviteemail.toLowerCase();
            res.redirect('/signin');
        }
        if (!result) {
            res.redirect('/no-access')
        }
    });
});

router.get('/no-access', notLoggedIn, function(req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard')
    } else {
        res.render('modules/landing/noaccess', {title: 'Creator', csrfToken: req.csrfToken()});
    }
});

router.get('/signin', notLoggedIn, function(req, res, next) {
    if (!req.session.inviteemail) {
        res.redirect('/');
    }
    if (req.isAuthenticated()) {
        res.redirect('/dashboard')
    }
    else {
        res.render('modules/signin/index', {title: 'Creator Sign In', csrfToken: req.csrfToken()});
    }
});

router.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email'}));

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect : '/dashboard',
        failureRedirect : '/'
    })
);

router.get('/signout', function(req, res, next) {
    req.logout();
    res.redirect('/signin');
});

router.get('/404', function(req, res, next) {
    res.render('404', {title: 'Page Not Found', csrfToken: req.csrfToken()});
});

router.get('/:username', function(req, res, next) {
    var username = req.params.username;
    Member.findOne({username: new RegExp('^'+username+'$', "i")}, function(err, result) {
        if (!result) {
            res.redirect('/404')
        } else {
            Tutorial.find({author: result.id}).sort('-timestamp').exec(function(err, tutorials) {
                console.log(result);
                var influences = result.youtube.subscribers + result.instagram.followers + result.blog.monthlyviews;
                res.render('modules/profile/index', {title: result.displayname, member: result, influences: influences, tutorials: tutorials,});
            });
        }
    });
});

module.exports = router;

function notLoggedIn (req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
}