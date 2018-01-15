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
    var success = req.flash('success');
    Merchant.find().exec(function(err, results) {
        res.render('modules/merchants/list', { title: 'Merchant List', mainactive:'merchant', subactive:'merchantlist', merchants: results, flash: success });
    });
});

router.get('/add', isLoggedIn, function(req, res, next) {
    res.render('modules/merchants/add', { title: 'Add New Merchant', mainactive:'merchant', subactive:'merchantlist', csrfToken: req.csrfToken() });
});

router.post('/add', isLoggedIn, function(req, res, next) {
    var newMerchant = new Merchant({
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(5), null),
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
        },
        created_at: moment().format(),
        status: 'active'
    });
    newMerchant.save();
    req.flash('success', req.body.companyname + ' has been successfully created');
    res.redirect('/merchants')
});

router.get('/edit/:merchantid', isLoggedIn, function(req, res, next) {
    var merchantid = req.params.merchantid;
    Merchant.findById(merchantid).exec(function(err, merchant) {
        res.render('modules/merchants/edit', { title: 'Edit Merchant', mainactive:'merchant', subactive:'merchantlist', merchant: merchant, csrfToken: req.csrfToken() });
    });
});

router.post('/edit/:merchantid', isLoggedIn, function(req, res, next) {
    var merchantid = req.params.merchantid;
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
        },
        bank: {
            name: req.body.bankname,
            swift: req.body.bankswift,
            country: req.body.bankcountry,
            accountname: req.body.accountnumber,
            accountnumber: req.body.accountnumber
        },
        payment: {
            salesComission: (req.body.commission / 100)
        },

        shippingfees: {
            local: req.body.localshippingfees,
            international: req.body.intshippingfees
        },
        shippingDays: {
            localMinShippingDays: req.body.localMinShippingDays,
            localMaxShippingDays: req.body.localMaxShippingDays,
            intMinShippingDays: req.body.intMinShippingDays,
            intMaxShippingDays: req.body.intMaxShippingDays
        },
        status: req.body.status
    };
    Merchant.findByIdAndUpdate(merchantid, editMerchant).exec(function(err, merchant) {
        req.flash('success', merchant.company.name + ' has been successfully updated');
        res.redirect('/merchants')
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