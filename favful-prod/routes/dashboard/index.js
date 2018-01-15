var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var async= require('async');
var moment = require('moment');

var Member = require('../../models/member/member');
var Tutorial = require('../../models/tutorial/tutorial');
var Order = require('../../models/order/order');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', isLoggedIn, function(req, res, next) {
    async.parallel(
        {
            member: function(member) {Member.findById(req.user.id).exec(member)},
            tutorials: function(tutorials) {Tutorial.find({author: req.user.id}).populate('author products').populate({path:'products', populate: {path:'brand'}}).exec(tutorials)},
            tutorialcount: function(tutorialcount) {Tutorial.find({author: req.user.id, status: 'active'}).count().exec(tutorialcount)},
            orders: function(orders) {Order.find({member: req.user.id}).populate('merchants.items').exec(orders)}
        }, function (err, results) {
            var member = results.member;
            var tutorials = results.tutorials;
            var contributed = results.tutorialcount;
            var orders = results.orders;
            var influences = member.youtube.subscribers + member.instagram.followers + member.blog.monthlyviews;
            console.log(orders)
            Member.findByIdAndUpdate(req.user.id, {lastlogin_at: moment().format(), influence: influences}, function(err, done) {
                res.render('modules/dashboard/index', {title: 'Dashboard', csrfToken: req.csrfToken(), member: member, contributed: contributed, tutorials: tutorials, orders: orders});
            });
    });
});

router.post('/save-profile', isLoggedIn, function(req, res, next) {
    var updateProfile = {
        shortintro: req.body.shortintro,
        birthday: moment(req.body.birthday).format('YYYY-MM-DD'),
        profile: {
            skintype: req.body.skintype,
            skintone: req.body.skintone
        }
    };
    Member.findOneAndUpdate({_id: req.user.id}, updateProfile).exec(function(err, success) {
       res.redirect('/dashboard');
    });
});

module.exports = router;

function isLoggedIn (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

function notLoggedIn (req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
}