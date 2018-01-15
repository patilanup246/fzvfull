var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var moment = require('moment');
var multiparty = require('connect-multiparty');
var fs = require('fs');
var AWS = require('aws-sdk');
var shortid = require('shortid');
var path = require('path');
var slugify = require('slugify');
var getVideoId = require('get-video-id');
var embedVideo = require('embed-video');

var Tutorial = require('../../models/tutorial/tutorial');
var Media = require('../../models/media/media');

AWS.config.loadFromPath('./config/aws-config.json');
var s3 = new AWS.S3();
var csrfProtection = csrf({cookie: true});
var multipartyMiddleware = multiparty();

router.use(multipartyMiddleware);
router.use(csrfProtection);

//Authorized START//

router.get('/video', isLoggedIn, function(req, res, next) {
    res.render('modules/tutorial/video', {title: 'Post Video Tutorial', csrfToken: req.csrfToken()});
});

router.post('/video', isLoggedIn, function(req, res, next) {
    var videoDetails = getVideoId(req.body.videourl);
    var slugy = slugify(req.body.title);
    var slug = slugy.toLowerCase();
    var newTutorial = new Tutorial ({
        title: req.body.title,
        slug: slug,
        videoid: videoDetails.id,
        shortdescription: req.body.shortdescription,
        content: req.body.content,
        type: 'video-' + videoDetails.service,
        author: req.user.id,
        status: 'active',
        timestamp: moment().format()
    });
    newTutorial.save(function(err, success) {
        res.redirect('/tutorial/success');
    });
});

router.get('/image', isLoggedIn, function(req, res, next) {
    res.render('modules/tutorial/image', {title: 'Post Image Tutorial', csrfToken: req.csrfToken()});
});

router.post('/image', isLoggedIn, function(req, res, next) {
    var file = req.files.mediafile;
    var filename = shortid.generate();
    var stream = fs.createReadStream(file.path);
    var bucketPath = 'favful-creator/tutorial-media';
    var newMedia = {Bucket: bucketPath, Key: filename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};

    s3.upload(newMedia, function(err, success) {
        if (err) console.error(err);
        var addMedia = new Media ({
            name: file.originalFilename,
            slug: filename + path.extname(file.originalFilename),
            type: file.type,
            path: decodeURIComponent(success.Location),
            timestamp: moment().format(),
            uploadby: req.user.id
        });
        addMedia.save(function(err, media) {
            var slugy = slugify(req.body.title);
            var slug = slugy.toLowerCase();

            var newTutorial = new Tutorial ({
                title: req.body.title,
                slug: slug,
                thumbnail: media.path,
                shortdescription: req.body.shortdescription,
                content: req.body.content,
                type: 'image',
                status: 'active',
                author: req.user.id,
                timestamp: moment().format()
            });
            newTutorial.save();
            fs.unlink(file.path, function() {});
            res.redirect('/tutorial/success')
        });
    });
});

router.get('/success', isLoggedIn, function(req, res, next) {
    res.render('modules/tutorial/success', {title: 'Successfully Posted A Tutorial'});
});

router.get('/list', isLoggedIn, function(req, res, next) {
    Tutorial.find({}).sort('-timestamp').exec(function(err, tutorials) {
        res.render('modules/tutorial/list', {title: 'Tutorial List', tutorials: tutorials});
    });
});

router.get('/:tutorial', function(req, res, next) {
    var tutorialslug = req.params.tutorial;
    Tutorial.findOne({slug:tutorialslug}).populate('author').exec(function(err, tutorial) {
        Tutorial.find({status:'active'}).populate('author').sort('-timestamp').limit(5).exec(function(err, latesttuts) {
            res.render('modules/tutorial/view', {title: tutorial.title, csrfToken: req.csrfToken(), tutorial: tutorial, latesttuts: latesttuts});
        });
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