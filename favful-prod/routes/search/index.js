var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var async = require('async');

var Product = require('../../models/product/product');
var Brand = require('../../models/product/brand');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    var q = req.query.q;
    async.parallel({
        featuredproducts: function(featuredproducts) {Product.find({$text:{$search: q}, instore: true}).populate('brand').exec(featuredproducts)},
        productlist: function(productlist) {Product.find({$text:{$search: q}}).limit(12).populate('brand').exec(productlist)}
    }, function(err, results) {
        var productlist = results.productlist;
        var featuredproducts = results.featuredproducts;
        var productResultCount = results.productlist.length + results.featuredproducts.length;
        res.render('modules/search/index', {title: 'Search', productlist: productlist, productResultCount: productResultCount, featuredproducts: featuredproducts, q: q});
    });
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