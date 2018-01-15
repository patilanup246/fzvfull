var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var log = require('audit-log');
var bcrypt = require('bcrypt');
var User = require('../../models/user/user');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

//Authorized START//

router.get('/list', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    User.find({}).exec(function(err, users) {
        res.render('modules/user/list', { title: 'User List', users: users, flash: success, mainactive:'usermanagement', subactive:'userlist' });
    });
});

router.get('/add', isLoggedIn, function(req, res, next) {
    res.render('modules/user/add', { title: 'Add User', csrfToken: req.csrfToken(), mainactive:'usermanagement', subactive:'adduser'});
});

router.post('/add', isLoggedIn, function(req, res, next) {
    User.findOne({'username': req.body.username}, function(err, user) {
        if (err) {
            console.error(err)
        }
        if (user) {
            req.flash('success', 'Username "' + req.body.username + '" has been used');
            res.redirect('/user/list');
        } else {
                var newUser = new User({
                    username: req.body.username,
                    password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null),
                    email: req.body.email,
                    displayname: req.body.displayname,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    phone: req.body.phone,
                    address: {
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        postalcode: req.body.postalcode,
                        state: req.body.state,
                        country: req.body.country
                    },
                    status: 'active'
                });
                newUser.save();
                log.logEvent(req.user.username, '/user/add', 'Add User', '<span style="color:green">User Added</span>', 'User Added', 'User "' + req.body.username + '" has been added by ' + req.user.username);
                req.flash('success', 'User "' + req.body.displayname + '" has been added');
                res.redirect('/user/list')
            }
    });
});

router.get('/suspend/:userid', isLoggedIn, function(req, res, next) {
    var userid = req.params.userid;
    User.findByIdAndUpdate(userid, {
        status: 'suspended'
    }, function (err, result) {
        log.logEvent(req.user.username, '/user/suspend', 'Suspend User', '<span style="color:orange">User Suspended</span>', 'User Suspended', 'User "' + result.username + '" has been suspended by ' + req.user.username);
        req.flash('success', 'User ' + result.displayname + ' has been suspended');
        res.redirect('/user/list');
    });
});

router.get('/reactivate/:userid', isLoggedIn, function(req, res, next) {
    var userid = req.params.userid;
    User.findByIdAndUpdate(userid, {
        status: 'active'
    }, function (err, result) {
        log.logEvent(req.user.username, '/user/active', 'Reactivate User', '<span style="color:green">User Reactivated</span>', 'User Reactivated', 'User "' + result.username + '" has been reactivated by ' + req.user.username);
        req.flash('success', 'User ' + result.displayname + ' has been reactivated');
        res.redirect('/user/list');
    });
});

router.get('/delete/:userid', isLoggedIn, function(req, res, next) {
    var userid = req.params.userid;
    User.findByIdAndRemove(userid, function (err, result) {
        log.logEvent(req.user.username, '/user/delete', 'Delete User', '<span style="color:green">User Deleted</span>', 'User Deleted', 'User "' + result.username + '" has been deleted by ' + req.user.username);
        req.flash('success', 'User ' + result.displayname + ' has been removed');
        res.redirect('/user/list');
    });
});

router.get('/edit/:userid', isLoggedIn, function(req, res, next) {
    var userid = req.params.userid;
    User.findOne({_id: userid}).exec(function(err, users) {
        res.render('modules/user/edit', { title: 'Edit User', user: users, csrfToken: req.csrfToken() });
    });
});

router.post('/edit/:userid', isLoggedIn, function(req, res, next) {
    var userid = req.params.userid;
    User.findOneAndUpdate({_id: userid}, {
        username: req.body.username,
        email: req.body.email,
        displayname: req.body.displayname,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        phone: req.body.phone,
        address: {
            address1: req.body.address1,
            address2: req.body.address2,
            city: req.body.city,
            postcode: req.body.postcode,
            state: req.body.state,
            country: req.body.country
        }
    }, function(err, result) {
        log.logEvent(req.user.username, '/user/edit', 'Edit User', '<span style="color:green">User Edited</span>', 'User Edited', 'User "' + result.username + '" has been added by ' + req.user.username);
        req.flash('success', 'User "' + req.body.username + '" successfully updated');
        res.redirect('/user/list');
    });
});

//Authorized END//

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