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

router.get('/shipping', isLoggedIn, function(req, res, next) {
    Merchant.findById(req.user.id).exec(function(err, merchant) {
        var success = req.flash('success');
        res.render('modules/settings/shipping', { title: 'Shipping Settings', flash: success, mainactive:'settings', subactive:'shipping', merchant: merchant, csrfToken: req.csrfToken() });
    });
});

router.post('/shipping', isLoggedIn, function(req, res, next) {
    var editShipping = {
        shippingfees: {
            local: req.body.localshipping,
            international: req.body.intshipping
        },
        shippingDays: {
            localMinShippingDays: req.body.localMinShippingDays,
            localMaxShippingDays: req.body.localMaxShippingDays,
            intMinShippingDays: req.body.intMinShippingDays,
            intMaxShippingDays: req.body.intMaxShippingDays
        }
    };
    Merchant.findByIdAndUpdate(req.user.id, editShipping).exec(function(err, merchant) {
        req.flash('success', merchant.company.name + ' has been successfully updated');
        res.redirect('/settings/shipping')
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