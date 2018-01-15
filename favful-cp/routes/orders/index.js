var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var log = require('audit-log');
var bcrypt = require('bcrypt');
var moment = require('moment');
var async = require('async');

var Member = require('../../models/member/member');
var Product = require('../../models/product/product');
var Order = require('../../models/order/order');
var Fulfillment = require('../../models/order/fulfillment');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/fulfillment', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Fulfillment.find().exec(function(err, results) {
        res.render('modules/orders/fulfillment', { title: 'Fulfillment Control', mainactive:'orders', subactive:'fulfillmentcontrol', fulfillments: results, flash: success });
    });
});

router.get('/list', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Order.find({orderId: {$exists: true}}).exec(function(err, results) {
        res.render('modules/orders/list', { title: 'Order List', mainactive:'orders', subactive:'orderlist', orders: results, flash: success });
    });
});

router.get('/add', isLoggedIn, function(req, res, next) {
    async.parallel({
        memberList: function(memberList) {Member.find().exec(memberList)},
        productList: function(productList) {Product.find({instore: true}).exec(productList)}
    }, function(err, results) {
        var memberList = results.memberList;
        var productList = results.productList;
        var merchantList = [];

        for(var i = 0; i < productList.length; i++) {
            var productList = productList[i].items;
            var merchants = [];
            for(var j = 0; j < productList; j++) {
                merchants.push(productList[j]);
            }
        }

        res.render('modules/orders/add', { title: 'Manual Order Entry', mainactive:'orders', subactive:'orderlist', memberList: memberList});
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