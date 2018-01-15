var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    res.render('modules/beautyadvisor/beautyadvisor', {title: 'Questions and Answers'});
});

router.get('/topadvisor', function(req, res, next) {
    res.render('modules/beautyadvisor/topadvisor', {title: 'Top Advisor'});
});

router.get('/beautyadvisortitle', function(req, res, next) {
    res.render('modules/beautyadvisor/beautyadvisortitle', {title: 'Beauty Title'});
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