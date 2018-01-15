var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var async = require('async');

var Tutorial = require('../../models/tutorial/tutorial');
var Product = require('../../models/product/product');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
	async.parallel ({
        featuredproducts: function(featuredproducts) {Product.find({instore: true}).limit(12).populate('brand author').exec(featuredproducts)},
		toptutorial: function(toptutorial) {Tutorial.find({status:'active'}).populate('author').sort('-timestamp').limit(3).exec(toptutorial)}
	}, function(err, results) {
		var featuredproducts = results.featuredproducts;
		var toptutorial = results.toptutorial;
		res.render('modules/product/list', {title: 'Trending Product', csrfToken: req.csrfToken(), toptutorial: toptutorial, featuredproducts: featuredproducts});
	});
});

router.get('/:productslug', function(req, res, next) {
    var productslug = req.params.productslug;
    async.parallel({
    singleproduct: function(singleproduct) {Product.findOne({slug: productslug}).populate('brand').exec(singleproduct)},
    featuredproducts: function(featuredproducts) {Product.find({instore: true}).limit(4).populate('brand author').exec(featuredproducts)},
    toptutorial: function(toptutorial) {Tutorial.find({status:'active'}).populate('author products').populate({path:'products', populate: {path:'brand'}}).sort('-timestamp').limit(2).exec(toptutorial)}

    }, function(err, result) {
        var singleproduct = result.singleproduct;
        var featuredproducts = result.featuredproducts;
        var toptutorial = result.toptutorial;
        res.locals.path = req.path;
        res.render('modules/product/single', {title: singleproduct.name, csrfToken: req.csrfToken(), singleproduct: singleproduct,featuredproducts: featuredproducts,toptutorial: toptutorial, path: req.path});
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