var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var moment = require('moment');
var async = require('async');

var Tutorial = require('../../models/tutorial/tutorial');
var Product = require('../../models/product/product');
var Member = require('../../models/member/member');
var HeartLog = require('../../models/tracker/heartlog');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    async.parallel ({
        tutorials: function(tutorials) {Tutorial.find({status:'active'}).populate('author products').populate({path:'products', populate: {path:'brand'}}).sort('-timestamp').exec(tutorials)},
        trendingexpert: function(trendingexpert) {Member.find({rank:'creator'}).sort('-influence').limit(6).exec(trendingexpert)}
    }, function (err, results) {
        var tutorials = results.tutorials;
        var trendingexpert = results.trendingexpert;
        res.render('modules/tutorial/list', {title: 'Beauty Tutorial', tutorials: tutorials, trendingexpert: trendingexpert});
    });
});

router.get('/:tutorialslug', function(req, res, next) {
    var tutorialslug = req.params.tutorialslug;
    if (req.user)
        var userid = req.user.id;
    if (!req.user)
        var userid = null;
    Tutorial.findOne({slug: tutorialslug}).populate('author products').exec(function(err, tutorial) {
        async.parallel ({
            relatedtutorials: function(relatedtutorials) {Tutorial.find().sort('-timestamp').limit(3).populate('author products').populate({path:'products', populate: {path:'brand'}}).exec(relatedtutorials)},
            heartcount: function(heartcount) {HeartLog.find({tutorial:tutorial.id}).count().exec(heartcount)},
            heartvalidate: function(heartvalidate) {HeartLog.find({tutorial:tutorial.id, member: userid}).count().exec(heartvalidate)}
        }, function (err, results) {
            var relatedtutorials = results.relatedtutorials;
            var heartcount = results.heartcount;
            var heartvalidate = results.heartvalidate;
            res.locals.path = req.path;
            res.render('modules/tutorial/single', {title: tutorial.title, csrfToken: req.csrfToken(), tutorial: tutorial, heartcount: heartcount, heartvalidate: heartvalidate, relatedtutorials: relatedtutorials, path: req.path});
        });
    });
});

router.get('/heart/:tutorialid', function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    Tutorial.findByIdAndUpdate(tutorialid, { $inc: {heart: 1}}).exec(function(err, tutorial) {
        var newHeartLog = new HeartLog ({
            tutorial: tutorial.id,
            member: req.user.id,
            timestamp: moment().format()
        });
        newHeartLog.save(function(err, success) {
            Member.findByIdAndUpdate(tutorial.author, {$inc: {benefited: 1}}).exec(function(err, done) {
                res.redirect('/tutorial/' + tutorial.slug);
            });
        });
    });
});

router.get('/unheart/:tutorialid', function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    Tutorial.findByIdAndUpdate(tutorialid, { $inc: {heart: -1} }).exec(function(err, tutorial) {
        HeartLog.findOneAndRemove({tutorial: tutorialid, member: req.user.id}).exec(function(err, success) {
            Member.findByIdAndUpdate(tutorial.author, {$inc: {benefited: -1}}).exec(function(err, done) {
                res.redirect('/tutorial/' + tutorial.slug);
            });
        });
    });
});

router.get('/post', function(req, res, next) {
    res.render('modules/tutorial/tutorial', {title: 'Tutorial'});
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