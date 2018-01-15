var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var async = require('async');
var moment = require('moment');

var Member = require('../../models/member/member');
var Brand = require('../../models/product/brand');
var Product = require('../../models/product/product');
var Tutorial = require('../../models/tutorial/tutorial');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/summary', isLoggedIn, function(req, res, next) {
    var today = moment().startOf('day').format();
    var yesterday = moment(today).add(-1, 'days').format();
    var tomorrow = moment(today).add(1, 'days').format();
    async.parallel({
        totalmembers: function(totalmembers) {Member.count({}).exec(totalmembers)},
        totalregistered: function(totalregistered) {Member.count({"fb.id":{$exists:true}}).exec(totalregistered)},
        yesterreg: function(yesterreg) {Member.count({created_at: {$gte: yesterday, $lt: today}}).exec(yesterreg)},
        todayreg: function(todayreg) {Member.count({created_at: {$gte: today, $lt: tomorrow}}).exec(todayreg)},
        totalbrands: function(totalbrands) {Brand.count({}).exec(totalbrands)},
        totalproducts: function(totalproducts) {Product.count({}).exec(totalproducts)},
        totaltutorials: function(totaltutorials) {Tutorial.count({}).exec(totaltutorials)}
    },function(err, results) {
        console.log(moment().add(-1, 'days').format());
        res.render('modules/statistics/summary', { title: 'Statistic Summary', mainactive:'statistics', subactive:'statisticsummary', results: results});
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
    res.redirect('/dashboard');
}