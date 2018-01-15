var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');

var Member = require('../../models/member/member');

var csrfProtection = csrf({cookie: true});

router.use(csrfProtection);

//Authorized START//

router.get('/list', function(req, res, next) {
    Member.find({influence: ''});
    Member.find({influence: {$ne: ''}, type: 'member'}).exec(function(err, results) {
        res.render('modules/creator/index', {title: 'Creator List', csrfToken: req.csrfToken(), creators: results});
    });
});


module.exports = router;

function isLoggedIn (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}