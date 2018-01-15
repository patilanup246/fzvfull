var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var AuditLog = require('../../models/log/auditlog');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

//Authorized START//

router.get('/auditlogs', isLoggedIn, function(req, res, next) {
    AuditLog.find({})
        .sort('-date')
        .limit(50)
        .exec(function(err, result) {
        res.render('modules/site/auditlogs', { title: 'Audit Logs', logs: result, mainactive:'management', subactive:'auditlogs' });
    });
});

//Authorized END//

module.exports = router;

function isLoggedIn (req, res, next) {
    if (req.isAuthenticated()) {
        req.session.email = req.user.email;
        req.session.fullname = req.user.fullname;
        req.session.role = req.user.role;
        res.locals.session = req.session;
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