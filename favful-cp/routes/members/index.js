var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var log = require('audit-log');
var bcrypt = require('bcrypt');
var moment = require('moment');

var Member = require('../../models/member/member');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

//Authorized START//

router.get('/creator', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Member.find({rank: 'creator'}).exec(function(err, members) {
        res.render('modules/members/list', { title: 'Creator List', flash: success, mainactive:'membersmanagement', subactive:'creatorlist', members: members});
    });
});

router.get('/normal', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Member.find({rank: {$exists: false}}).exec(function(err, members) {
        res.render('modules/members/list', { title: 'Normal Member List', flash: success, mainactive:'membersmanagement', subactive:'normallist', members: members});
    });
});

router.get('/edit/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findOne({_id: memberid}).exec(function(err, member) {
        res.render('modules/members/edit', { title: 'Edit Member Details', member: member, csrfToken: req.csrfToken() });
    });
});

router.post('/edit/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findByIdAndUpdate(memberid, { $set:{
        displayname: req.body.displayname,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        birthday: moment(req.body.birthday).format('YYYY-MM-DD'),
        email: req.body.email,
        fb: {
            id: req.body.fbid,
            access_token: req.body.fbtoken,
            friends: req.body.fbfriends
        },
        blog: {
            url: req.body.blogurl,
            monthlyviews: req.body.blogmonthlyviews
        },
        youtube: {
            url: req.body.youtubeurl,
            subscribers: req.body.youtubesubscribers
        },
        instagram: {
            url: req.body.instausername,
            followers: req.body.instafollowers
        }}
    }, function(err, result) {
        log.logEvent(req.user.username, '/members/edit', 'Edit Member', '<span style="color:green">Member Edited</span>', 'Member Edited', 'Member "' + result.displayname + '" has been edited by ' + req.user.username);
        req.flash('success', 'Member "' + req.body.displayname + '" successfully updated');
        res.redirect('/members/list');
    });
});

router.get('/editnonreg/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findOne({_id: memberid}).exec(function(err, member) {
        res.render('modules/members/editnonreg', { title: 'Edit Non Registered Member', member: member, csrfToken: req.csrfToken() });
    });
});

router.post('/editnonreg/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findByIdAndUpdate(memberid, { $set:{
        displayname: req.body.displayname,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        birthday: moment(req.body.birthday).format('YYYY-MM-DD'),
        email: req.body.email,
        blog: {
            url: req.body.blogurl,
            monthlyviews: req.body.blogmonthlyviews
        },
        youtube: {
            url: req.body.youtubeurl,
            subscribers: req.body.youtubesubscribers
        },
        instagram: {
            url: req.body.instausername,
            followers: req.body.instafollowers
        }}
    }, function(err, result) {
        log.logEvent(req.user.username, '/members/edit', 'Edit Member', '<span style="color:green">Member Edited</span>', 'Member Edited', 'Member "' + result.displayname + '" has been edited by ' + req.user.username);
        req.flash('success', 'Member "' + req.body.displayname + '" successfully updated');
        res.redirect('/members/list');
    });
});

router.get('/suspend/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findByIdAndUpdate(memberid, {
        status: 'suspended'
    }, function (err, result) {
        log.logEvent(req.user.username, '/user/suspend', 'Suspend Member', '<span style="color:orange">Member Suspended</span>', 'Member Suspended', 'Member "' + result.username + '" has been suspended by ' + req.user.username);
        req.flash('success', 'Member ' + result.displayname + ' has been suspended');
        res.redirect('/members/list');
    });
});

router.get('/reactivate/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findByIdAndUpdate(memberid, {
        status: 'active'
    }, function (err, result) {
        log.logEvent(req.user.username, '/user/active', 'Reactivate Member', '<span style="color:green">Member Reactivated</span>', 'Member Reactivated', 'Member "' + result.username + '" has been reactivated by ' + req.user.username);
        req.flash('success', 'Memebr ' + result.displayname + ' has been reactivated');
        res.redirect('/members/list');
    });
});

router.get('/delete/:memberid', isLoggedIn, function(req, res, next) {
    var memberid = req.params.memberid;
    Member.findByIdAndRemove(memberid, function (err, result) {
        log.logEvent(req.user.username, '/user/delete', 'Delete Member', '<span style="color:green">Member Deleted</span>', 'Member Deleted', 'Member "' + result.username + '" has been deleted by ' + req.user.username);
        req.flash('success', 'Member ' + result.displayname + ' has been removed');
        res.redirect('/members/list');
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