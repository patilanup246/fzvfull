var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');

var configs = require('../config/froala.json');
var FroalaEditor = require('wysiwyg-editor-node-sdk/lib/froalaEditor');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

//Authorized START//

router.get('/signout', isLoggedIn, function(req, res, next) {
    req.session.destroy(function() {
        res.redirect('/')
    });
});

router.get('/dashboard', isLoggedIn, function(req, res, next) {
    res.render('modules/dashboard/index', { title: 'Dashboard', mainactive:'dashboard' });
});

router.get('/business-intelligence', isLoggedIn, function(req, res, next) {
    res.render('modules/quicksight/index', { title: 'Dashboard', mainactive:'businessintelligence' });
});

router.get('/get_signature', isLoggedIn, function(req, res, next) {
    var s3Hash = FroalaEditor.S3.getHash(configs);
    res.send(s3Hash);
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