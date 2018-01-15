var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var bcrypt = require('bcrypt');
var moment = require('moment');
var async = require('async');

var Merchant = require('../models/merchant/merchant');
var Fulfillment = require('../models/order/fulfillment');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

//Authorized START//

router.get('/signout', isLoggedIn, function(req, res, next) {
    req.session.destroy(function() {
        res.redirect('/')
    });
});

router.get('/dashboard', isLoggedIn, function(req, res, next) {
    async.parallel({
        pendingOrders: function(pendingOrders) {Fulfillment.find({merchant: req.user.id}).sort('createdAt').exec(pendingOrders)},
        totalSales: function(totalSales) {
            Fulfillment.find({merchant: req.user.id}).exec(function(err, results) {
                var totalShippingFees = 0;

                for(var i = 0; i < results.length; i++) {
                    totalShippingFees += parseFloat(results[i].shippingFees);

                    var totalItemSales = 0;
                    var items = results[i].items;
                    for(var j = 0; j < items.length; j++) {
                        totalItemSales += parseFloat(items[j].costPrice * items[j].quantity);
                    }

                }

                var totalSalesResult = parseFloat(totalShippingFees + totalItemSales).toFixed(2);
                totalSales(null, totalSalesResult)
            });
        }
    }, function(err, results) {
        var pendingOrders = results.pendingOrders;
        var totalSales = results.totalSales;
        res.render('modules/dashboard/index', { title: 'Dashboard', mainactive: 'dashboard', pendingOrders: pendingOrders, totalSales: totalSales });
    });
});

//Authorized END//

//Not Authorized START//

router.use('/', notLoggedIn, function(res, req, next) {
    next();
});

router.get('/', function(req, res, next) {
    var error = req.flash('error');
    res.render('modules/signin/index', {
        title: 'Sign In',
        csrfToken: req.csrfToken(),
        flash: error
    });
});

router.get('/404', function(req, res, next) {
    var error = req.flash('error');
    res.render('modules/signin/index', {title: 'Page Not Found'});
});

router.post('/', passport.authenticate('local.signin', {
    successRedirect: '/dashboard', failureRedirect: '/', failureFlash: true
}));

router.get('/password-reset', function(req, res, next) {
    res.render('modules/password-reset/index', { title: 'Password Recovery', dclogo: '../images/admin/dclogo.png' });
});

//Not Authorized END//


//Registration//

router.get('/register', function(req, res) {
    var error = req.flash('error');
    res.render('modules/signin/register', {user: req.user, csrfToken: req.csrfToken(),flash: error});
});

router.post('/register', function(req, res, next) {
    var newUser = new Merchant({
        email: req.body.email,
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(5), null),
        company: {
            name: req.body.company
        },
        created_at: moment().format(),
        status: 'pending'
        
    });
    newUser.save();
    req.flash('error', 'Merchant '+ req.body.company + ' has been registered');
    res.redirect('/')
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