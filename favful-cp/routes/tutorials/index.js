var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var log = require('audit-log');
var slug = require('slug');
var moment = require('moment');
var path = require('path');
var shortid = require('shortid');
var async = require('async');
var multiparty = require('connect-multiparty');
var fs = require('fs');
var AWS = require('aws-sdk');

var Tutorial = require('../../models/tutorial/tutorial');
var Member = require('../../models/member/member');
var Product = require('../../models/product/product');

AWS.config.loadFromPath('./config/aws-config.json');
var s3 = new AWS.S3();
var s3VideoBucket = 'favful-public/tutorials/videos/processed';
var s3VideoThumbnailBucket = 'favful-public/tutorials/videos/thumbnails';
var s3ImageTutorialBucket = 'favful-public/tutorials/images/thumbnails';

var multipartyMiddleware = multiparty();
var csrfProtection = csrf({cookie: true});

router.use(multipartyMiddleware);
router.use(csrfProtection);

//Authorized START//

router.get('/list', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Tutorial.find({}).sort('-timestamp').populate('author').exec(function(err, tutorials) {
        res.render('modules/tutorials/list', { title: 'Tutorial List', tutorials: tutorials, flash: success, mainactive:'tutorialmanagement', subactive:'tutoriallist' });
    });
});

router.get('/add', isLoggedIn, function(req, res, next) {
    async.parallel({
        members: function(members) {Member.find().exec(members)},
        products: function(products) {Product.find().exec(products)}
    }, function(err, results) {
        var members = results.members;
        var products = results.products;
        res.render('modules/tutorials/add', { title: 'Add New Tutorial', mainactive:'tutorialmanagement', subactive:'tutoriallist', csrfToken: req.csrfToken(), members: members, products: products });
    });
});

router.post('/add', isLoggedIn, function(req, res, next) {
    var videofile = req.files.videofile;
    var thumbnailfile = req.files.thumbnailfile;
    var videoNewName = shortid.generate();
    var thumbnailNewName = 'favful_' + slug(req.body.title, {lower:true}) + '_' + shortid.generate();
    var videostream = fs.createReadStream(videofile.path);
    var thumbnailstream = fs.createReadStream(thumbnailfile.path);
    var newVideo = {Bucket: s3VideoBucket, Key: videoNewName + path.extname(videofile.originalFilename), ACL: 'public-read', ContentType: videofile.type, Body: videostream};
    var newThumbnail = {Bucket: s3VideoThumbnailBucket, Key: thumbnailNewName + path.extname(thumbnailfile.originalFilename), ACL: 'public-read', ContentType: thumbnailfile.type, Body: thumbnailstream};
    s3.upload(newVideo, function(err, video) {
        s3.upload(newThumbnail, function(err, thumbnail) {
            var newTutorial = new Tutorial ({
                title: req.body.title,
                slug: slug(req.body.title, {lower:true}),
                thumbnail: thumbnailNewName + path.extname(thumbnailfile.originalFilename),
                thumbnailpath: decodeURIComponent(thumbnail.Location),
                videofilename: videoNewName + path.extname(videofile.originalFilename),
                videopath: decodeURIComponent(video.Location),
                shortdescription: req.body.shortdescription,
                content: req.body.content,
                products: req.body.products,
                status: req.body.status,
                type: 'video-upload',
                timestamp: moment().format(),
                author: req.body.member
            });
            newTutorial.save(function(err, success) {
                fs.unlink(videofile.path, function() {
                    fs.unlink(thumbnailfile.path, function() {
                        log.logEvent(req.user.username, '/tutorials/add', 'Add New Tutorial', '<span style="color:green">Added</span>', 'Tutorial Added', success.title + ' has been added by admin user: ' + req.user.username);
                        req.flash('success', success.title + ' successfully added');
                        res.redirect('/tutorials/list')
                    });
                });
            });
        });
    });
});

router.get('/add-image', isLoggedIn, function(req, res, next) {
    async.parallel({
        members: function(members) {Member.find().exec(members)},
        products: function(products) {Product.find().exec(products)}
    }, function(err, results) {
        var members = results.members;
        var products = results.products;
        res.render('modules/tutorials/add-image', { title: 'Add New Tutorial', mainactive:'tutorialmanagement', subactive:'tutoriallist', csrfToken: req.csrfToken(), members: members, products: products });
    });
});

router.post('/add-image', isLoggedIn, function(req, res, next) {
    var thumbnailfile = req.files.thumbnailfile;
    var thumbnailNewName = 'favful_' + slug(req.body.title, {lower:true}) + '_' + shortid.generate();
    var thumbnailstream = fs.createReadStream(thumbnailfile.path);
    var newThumbnail = {Bucket: s3ImageTutorialBucket, Key: thumbnailNewName + path.extname(thumbnailfile.originalFilename), ACL: 'public-read', ContentType: thumbnailfile.type, Body: thumbnailstream};
    s3.upload(newThumbnail, function(err, thumbnail) {
        var newTutorial = new Tutorial ({
            title: req.body.title,
            slug: slug(req.body.title, {lower:true}),
            thumbnail: thumbnailNewName + path.extname(thumbnailfile.originalFilename),
            thumbnailpath: decodeURIComponent(thumbnail.Location),
            shortdescription: req.body.shortdescription,
            content: req.body.content,
            products: req.body.products,
            status: req.body.status,
            type: 'image',
            timestamp: moment().format(),
            author: req.body.member
        });
        newTutorial.save(function(err, success) {
            fs.unlink(thumbnailfile.path, function() {
                log.logEvent(req.user.username, '/tutorials/add', 'Add New Tutorial', '<span style="color:green">Added</span>', 'Tutorial Added', success.title + ' has been added by admin user: ' + req.user.username);
                req.flash('success', success.title + ' successfully added');
                res.redirect('/tutorials/list')
            });
        });
    });
});

router.get('/edit/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    async.parallel({
        members: function(members) {Member.find().exec(members)},
        products: function(products) {Product.find().exec(products)},
        result: function(result) {Tutorial.findById(tutorialid).exec(result)}
    }, function(err, results) {
        var members = results.members;
        var result = results.result;
        var products = results.products;
        res.render('modules/tutorials/edit', { title: 'Edit A Tutorial', mainactive:'tutorialmanagement', subactive:'tutoriallist', csrfToken: req.csrfToken(), result: result, members: members, products: products });
    });
});

router.post('/edit/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    var file = req.files.thumbnailfile;
    if (!file.originalFilename) {
        var editTutorial = {
            title: req.body.title,
            slug: slug(req.body.title, {lower:true}),
            shortdescription: req.body.shortdescription,
            content: req.body.content,
            products: req.body.products,
            status: req.body.status,
            author: req.body.member
        };
        Tutorial.findByIdAndUpdate(tutorialid, editTutorial).exec(function(err, success) {
            log.logEvent(req.user.username, '/tutorials/edit', 'Edit Tutorial', '<span style="color:orange">Edited</span>', 'Tutorial Edited', success.title + ' has been edited by admin user: ' + req.user.username);
            req.flash('success', success.title + ' has been edited');
            res.redirect('/tutorials/list')
        });
    } else {
        var newFilename = 'favful_' + slug(req.body.title, {lower: true}) + '_' + shortid.generate();
        var stream = fs.createReadStream(file.path);
        var newThumbnail = {Bucket: s3VideoThumbnailBucket, Key: newFilename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};
        Tutorial.findById(tutorialid).exec(function(err, result) {
            var delMedia = {Bucket: s3VideoThumbnailBucket, Key: result.thumbnail};
            s3.deleteObject(delMedia, function(err, deleted) {
                s3.upload(newThumbnail, function(err, uploaded) {
                    var editTutorialWithFile = {
                        title: req.body.title,
                        slug: slug(req.body.title, {lower:true}),
                        shortdescription: req.body.shortdescription,
                        content: req.body.content,
                        products: req.body.products,
                        status: req.body.status,
                        author: req.body.member,
                        thumbnail: newFilename + path.extname(file.originalFilename),
                        thumbnailpath: decodeURIComponent(uploaded.Location)
                    };
                    Tutorial.findByIdAndUpdate(tutorialid, editTutorialWithFile).exec(function(err, success) {
                        fs.unlink(file.path, function() {
                            log.logEvent(req.user.username, '/tutorials/edit', 'Edit Tutorial', '<span style="color:orange">Edited</span>', 'Tutorial Edited', success.title + ' has been edited by admin user: ' + req.user.username);
                            req.flash('success', success.title + ' has been edited');
                            res.redirect('/tutorials/list')
                        });
                    });
                });
            });
        });
    }
});

router.get('/edit-image/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    async.parallel({
        members: function(members) {Member.find().exec(members)},
        products: function(products) {Product.find().exec(products)},
        result: function(result) {Tutorial.findById(tutorialid).exec(result)}
    }, function(err, results) {
        var members = results.members;
        var result = results.result;
        var products = results.products;
        res.render('modules/tutorials/edit', { title: 'Edit A Tutorial', mainactive:'tutorialmanagement', subactive:'tutoriallist', csrfToken: req.csrfToken(), result: result, members: members, products: products });
    });
});

router.post('/edit-image/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    var editTutorial = {
        title: req.body.title,
        slug: slug(req.body.title, {lower:true}),
        shortdescription: req.body.shortdescription,
        content: req.body.content,
        products: req.body.products,
        status: req.body.status,
        author: req.body.member
    };
    Tutorial.findByIdAndUpdate(tutorialid, editTutorial).exec(function(err, success) {
        log.logEvent(req.user.username, '/tutorials/edit', 'Edit Tutorial', '<span style="color:orange">Edited</span>', 'Tutorial Edited', success.title + ' has been edited by admin user: ' + req.user.username);
        req.flash('success', success.title + ' has been edited');
        res.redirect('/tutorials/list')
    });
});

router.get('/delete/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    Tutorial.findByIdAndRemove(tutorialid, function(err, result) {
        var delVideo = {Bucket: s3VideoBucket, Key: result.videofilename};
        var delThumbnail = {Bucket: s3VideoThumbnailBucket, Key: result.thumbnail};
        s3.deleteObject(delVideo, function(err, success) {
            s3.deleteObject(delThumbnail, function(err, success) {
                log.logEvent(req.user.username, '/tutorials/delete', 'Tutorial Deleted', '<span style="color:red">Deleted</span>', 'Tutorial Deleted', result.title + ' has been deleted by admin user: ' + req.user.username);
                req.flash('success', result.title + ' has been deleted');
                res.redirect('/tutorials/list')
            });
        });
    });
});

router.get('/delete-image/:tutorialid', isLoggedIn, function(req, res, next) {
    var tutorialid = req.params.tutorialid;
    Tutorial.findByIdAndRemove(tutorialid, function(err, result) {
        var delThumbnail = {Bucket: s3ImageTutorialBucket, Key: result.thumbnail};
        s3.deleteObject(delThumbnail, function(err, success) {
            log.logEvent(req.user.username, '/tutorials/delete', 'Tutorial Deleted', '<span style="color:red">Deleted</span>', 'Tutorial Deleted', result.title + ' has been deleted by admin user: ' + req.user.username);
            req.flash('success', result.title + ' has been deleted');
            res.redirect('/tutorials/list')
        });
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