var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var google = require('googleapis');
var youtube = google.youtube('v3');
var moment = require('moment');

var Member = require('../../models/member/member');
var Tutorial = require('../../models/tutorial/tutorial');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', isLoggedIn, function(req, res, next) {
    Tutorial.find({author: req.user.id}).sort('-timestamp').exec(function(err, results) {
        Member.findById(req.user.id).exec(function(err, member) {
            var influences = member.youtube.subscribers + member.instagram.followers + member.blog.monthlyviews;
            Member.findByIdAndUpdate(req.user.id, {lastlogin_at: moment().format(), influence: influences}, function(err, done) {
                res.render('modules/dashboard/index', {title: 'Home', csrfToken: req.csrfToken(), tutorials: results, influences: influences});
            });
        });
    });
});

module.exports = router;

function isLoggedIn (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}