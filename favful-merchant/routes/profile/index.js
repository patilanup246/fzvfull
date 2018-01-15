var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var log = require('audit-log');
var bcrypt = require('bcrypt');
var moment = require('moment');

var Merchant = require('../../models/merchant/merchant');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', isLoggedIn, function(req, res, next) {
    Merchant.findById(req.user.id).exec(function(err, merchant) {
        var success = req.flash('success');
        res.render('modules/profile/edit', { title: 'Edit Profile', flash: success, mainactive:'merchantprofile', subactive:'myprofile', merchant: merchant, csrfToken: req.csrfToken() });
    });
});

router.post('/edit', isLoggedIn, function(req, res, next) {
    var merchantid = req.user.id;
    var editMerchant = {
        email: req.body.email,
        company: {
            name: req.body.companyname,
            regnumber: req.body.regnumber,
            address01: req.body.address01,
            address02: req.body.address02,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            postcode: req.body.postcode,
            phone: req.body.companyphone
        }
    };
    Merchant.findByIdAndUpdate(merchantid, editMerchant).exec(function(err, merchant) {
        req.flash('success', merchant.company.name + ' has been successfully updated');
        res.redirect('/profile')
    });
});

router.get('/payment', isLoggedIn, function(req, res, next) {
    Merchant.findById(req.user.id).exec(function(err, merchant) {
        var success = req.flash('success');
        res.render('modules/profile/payment', { title: 'Edit Payment Details', flash: success, mainactive:'merchantprofile', subactive:'payment', merchant: merchant, csrfToken: req.csrfToken() });
    });
});

router.post('/payment', isLoggedIn, function(req, res, next) {
    var merchantid = req.user.id;
    var editMerchant = {
        bank: {
            name: req.body.bankname,
            swift: req.body.swift,
            country: req.body.bankcountry,
            accountname: req.body.accountname,
            accountnumber: req.body.accountnumber
        }
    };
    Merchant.findByIdAndUpdate(merchantid, editMerchant).exec(function(err, merchant) {
        req.flash('success', 'Payment details has been successfully updated');
        res.redirect('/profile/payment')
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