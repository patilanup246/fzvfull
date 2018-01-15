var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    res.render('modules/profile/profile', {title: 'Profile'});
});

router.get('/setup', function(req, res, next) {
    res.render('modules/profile/profile-setup', {title: 'Profile Setup Step'});
});

module.exports = router;

function isLoggedIn (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
}

function notLoggedIn (req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
}