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

var Brand = require('../../models/product/brand');
var Product = require('../../models/product/product');
var ProductTag = require('../../models/product/producttag');
var ProductAttribute = require('../../models/product/productattribute');

AWS.config.loadFromPath('./config/aws-config.json');
var s3 = new AWS.S3();
var s3BrandBucket = 'favful-public/brands';
var s3ProductImageBucket = 'favful-public/products/images';

var multipartyMiddleware = multiparty();
var csrfProtection = csrf({cookie: true});

router.use(multipartyMiddleware);
router.use(csrfProtection);

//Products//

router.get('/list', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Product.find({merchant: req.user.id}).sort('-created_at').populate('brand').select('name imagepath brand status slug').exec(function(err, results) {
        res.render('modules/products/product-list', { title: 'Product List', results: results, flash: success, mainactive:'products', subactive:'productlist' });
    });
});

router.get('/add', isLoggedIn, function(req, res, next) {
    async.parallel({
        brands: function(brands) {Brand.find().sort('name').exec(brands)},
        producttags: function(producttags) {ProductTag.find().exec(producttags)},
        productattributes: function(productattributes) {ProductAttribute.find().exec(productattributes)}
    }, function (err, results) {
        var brands = results.brands;
        var producttags = results.producttags;
        var productattributes = results.productattributes;
        res.render('modules/products/product-add', { title: 'Add A Product', mainactive:'products', subactive:'productlist', csrfToken: req.csrfToken(), brands: brands, producttags: producttags, productattributes: productattributes });
    });
});

router.post('/add', isLoggedIn, function(req, res, next) {
    var file = req.files.mediafile;
    var newFilename = 'favful_' + slug(req.body.name, {lower: true}) + '_' + shortid.generate();
    var stream = fs.createReadStream(file.path);
    var newMedia = {Bucket: s3ProductImageBucket, Key: newFilename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};
    s3.upload(newMedia, function(err, uploaded) {
        var newProduct = new Product ({
            brand: req.body.brand,
            name: req.body.name,
            slug: slug(req.body.name, {lower: true}),
            imagefilename: newFilename + path.extname(file.originalFilename),
            imagepath: decodeURIComponent(uploaded.Location),
            tags: req.body.tags,
            attribute: {
                skintype: req.body.skintype,
                flavor: req.body.flavor,
                color: req.body.color,
                design: req.body.design
            },
            ingredient: req.body.ingredient,
            volume: req.body.volume,
            costPrice: req.body.costprice,
            price: req.body.price,
            discountedprice: req.body.discountedprice,
            shortdescription: req.body.shortdescription,
            details: req.body.details,
            timestamp: moment().format(),
            addedby: req.user.id,
            merchant: req.user.id,
            instore: false,
            status: 'Pending Approval'
        });
        newProduct.save(function(err, success) {
            var selectedTags = String(req.body.tags).split(',');
            var selectedSkinType = String(req.body.skintype).split(',');
            var selectedFlavor = String(req.body.flavor).split(',');
            var selectedColor = String(req.body.color).split(',');
            var selectedDesign = String(req.body.design).split(',');
            selectedTags.forEach(function(tag) {
                ProductTag.findOne({slug: tag}, function(err, result) {
                    if (!result) {
                        var addTag = new ProductTag({
                            name: tag,
                            slug: slug(tag, {lower: true})
                        });
                        addTag.save();
                    }
                });
            });
            selectedSkinType.forEach(function(skintype) {
                ProductAttribute.findOne({slug: skintype}, function(err, result) {
                    if (!result) {
                        var addSkinType = new ProductAttribute({
                            name: skintype,
                            slug: slug(skintype, {lower: true})
                        });
                        addSkinType.save();
                    }
                });
            });
            selectedFlavor.forEach(function(flavor) {
                ProductAttribute.findOne({slug: flavor}, function(err, result) {
                    if (!result) {
                        var addFlavor = new ProductAttribute({
                            name: flavor,
                            slug: slug(flavor, {lower: true})
                        });
                        addFlavor.save();
                    }
                });
            });
            selectedColor.forEach(function(color) {
                ProductAttribute.findOne({slug: color}, function(err, result) {
                    if (!result) {
                        var addColor = new ProductAttribute({
                            name: color,
                            slug: slug(color, {lower: true})
                        });
                        addColor.save();
                    }
                });
            });
            selectedDesign.forEach(function(design) {
                ProductAttribute.findOne({slug: design}, function(err, result) {
                    if (!result) {
                        var addDesign = new ProductAttribute({
                            name: design,
                            slug: slug(design, {lower: true})
                        });
                        addDesign.save();
                    }
                });
            });
            fs.unlink(file.path, function() {
                req.flash('success', success.name + ' successfully added');
                res.redirect('/products/list')
            });
        });
    });
});

router.get('/edit/:productid', isLoggedIn, function(req, res, next) {
    var productid = req.params.productid;
    async.parallel({
        brands: function(brands) {Brand.find().exec(brands)},
        result: function(result) {Product.findById(productid).exec(result)},
        producttags: function(producttags) {ProductTag.find().exec(producttags)},
        productattributes: function(productattributes) {ProductAttribute.find().exec(productattributes)}
    }, function (err, results) {
        var brands = results.brands;
        var result = results.result;
        var producttags = results.producttags;
        var productattributes = results.productattributes;
        res.render('modules/products/product-edit', { title: 'Edit A Product', mainactive:'products', subactive:'productlist', csrfToken: req.csrfToken(), result: result, brands: brands, producttags: producttags, productattributes: productattributes });
    });
});

router.post('/edit/:productid', isLoggedIn, function(req, res, next) {
    var productid = req.params.productid;
    var file = req.files.mediafile;
    if (!file.originalFilename) {
        var editProductNoFile = {
            brand: req.body.brand,
            name: req.body.name,
            slug: slug(req.body.name, {lower: true}),
            tags: req.body.tags,
            attribute: {
                skintype: req.body.skintype,
                flavor: req.body.flavor,
                color: req.body.color,
                design: req.body.design
            },
            ingredient: req.body.ingredient,
            volume: req.body.volume,
            costPrice: req.body.costprice,
            price: req.body.price,
            discountedprice: req.body.discountedprice,
            shortdescription: req.body.shortdescription,
            details: req.body.details,
            merchant: req.user.id,
            status: 'Pending Approval'
        };
        Product.findByIdAndUpdate(productid, editProductNoFile, function(err, success) {
            var selectedTags = String(req.body.tags).split(',');
            var selectedSkinType = String(req.body.skintype).split(',');
            var selectedFlavor = String(req.body.flavor).split(',');
            var selectedColor = String(req.body.color).split(',');
            var selectedDesign = String(req.body.design).split(',');
            selectedTags.forEach(function(tags) {
                ProductTag.findOne({slug: tags}, function(err, result) {
                    if (!result) {
                        var addTag = new ProductTag({
                            name: tags,
                            slug: slug(tags, {lower: true})
                        });
                        addTag.save();
                    }
                });
            });
            selectedSkinType.forEach(function(skintype) {
                ProductAttribute.findOne({slug: skintype}, function(err, result) {
                    if (!result) {
                        var addSkinType = new ProductAttribute({
                            name: skintype,
                            slug: slug(skintype, {lower: true})
                        });
                        addSkinType.save();
                    }
                });
            });
            selectedFlavor.forEach(function(flavor) {
                ProductAttribute.findOne({slug: flavor}, function(err, result) {
                    if (!result) {
                        var addFlavor = new ProductAttribute({
                            name: flavor,
                            slug: slug(flavor, {lower: true})
                        });
                        addFlavor.save();
                    }
                });
            });
            selectedColor.forEach(function(color) {
                ProductAttribute.findOne({slug: color}, function(err, result) {
                    if (!result) {
                        var addColor = new ProductAttribute({
                            name: color,
                            slug: slug(color, {lower: true})
                        });
                        addColor.save();
                    }
                });
            });
            selectedDesign.forEach(function(design) {
                ProductAttribute.findOne({slug: design}, function(err, result) {
                    if (!result) {
                        var addDesign = new ProductAttribute({
                            name: design,
                            slug: slug(design, {lower: true})
                        });
                        addDesign.save();
                    }
                });
            });
            log.logEvent(req.user.username, '/products/edit', 'Edit Product', '<span style="color:orange">Edited</span>', 'Product Edited', success.name + ' has been edited by admin user: ' + req.user.username);
            req.flash('success', success.name + ' has been edited');
            res.redirect('/products/list')
        });
    } else {
        var newFilename = 'favful_' + slug(req.body.name, {lower: true}) + '_' + shortid.generate();
        var stream = fs.createReadStream(file.path);
        var newMedia = {Bucket: s3ProductImageBucket, Key: newFilename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};

        Product.findById(productid).exec(function(err, result) {
            var delMedia = {Bucket: s3ProductImageBucket, Key: result.imagefilename};
            s3.deleteObject(delMedia, function(err, deleted) {
                s3.upload(newMedia, function(err, uploaded) {
                    var editProductWithFile = {
                        brand: req.body.brand,
                        name: req.body.name,
                        slug: slug(req.body.name, {lower: true}),
                        imagefilename: newFilename + path.extname(file.originalFilename),
                        imagepath: decodeURIComponent(uploaded.Location),
                        tags: req.body.tags,
                        attribute: {
                            skintype: req.body.skintype,
                            flavor: req.body.flavor,
                            color: req.body.color,
                            design: req.body.design
                        },
                        ingredient: req.body.ingredient,
                        volume: req.body.volume,
                        costPrice: req.body.costprice,
                        price: req.body.price,
                        discountedprice: req.body.discountedprice,
                        shortdescription: req.body.shortdescription,
                        details: req.body.details,
                        merchant: req.user.id,
                        status: 'Pending Approval'
                    };
                    Product.findByIdAndUpdate(productid, editProductWithFile).exec(function(err, success) {
                        var selectedTags = String(req.body.tags).split(',');
                        var selectedSkinType = String(req.body.skintype).split(',');
                        var selectedFlavor = String(req.body.flavor).split(',');
                        var selectedColor = String(req.body.color).split(',');
                        var selectedDesign = String(req.body.design).split(',');
                        selectedTags.forEach(function(tags) {
                            ProductTag.findOne({slug: tags}, function(err, result) {
                                if (!result) {
                                    var addTag = new ProductTag({
                                        name: tags,
                                        slug: slug(tags, {lower: true})
                                    });
                                    addTag.save();
                                }
                            });
                        });
                        selectedSkinType.forEach(function(skintype) {
                            ProductAttribute.findOne({slug: skintype}, function(err, result) {
                                if (!result) {
                                    var addSkinType = new ProductAttribute({
                                        name: skintype,
                                        slug: slug(skintype, {lower: true})
                                    });
                                    addSkinType.save();
                                }
                            });
                        });
                        selectedFlavor.forEach(function(flavor) {
                            ProductAttribute.findOne({slug: flavor}, function(err, result) {
                                if (!result) {
                                    var addFlavor = new ProductAttribute({
                                        name: flavor,
                                        slug: slug(flavor, {lower: true})
                                    });
                                    addFlavor.save();
                                }
                            });
                        });
                        selectedColor.forEach(function(color) {
                            ProductAttribute.findOne({slug: color}, function(err, result) {
                                if (!result) {
                                    var addColor = new ProductAttribute({
                                        name: color,
                                        slug: slug(color, {lower: true})
                                    });
                                    addColor.save();
                                }
                            });
                        });
                        selectedDesign.forEach(function(design) {
                            ProductAttribute.findOne({slug: design}, function(err, result) {
                                if (!result) {
                                    var addDesign = new ProductAttribute({
                                        name: design,
                                        slug: slug(design, {lower: true})
                                    });
                                    addDesign.save();
                                }
                            });
                        });
                        fs.unlink(file.path, function() {});
                        log.logEvent(req.user.username, '/products/edit', 'Edit Product', '<span style="color:orange">Edited</span>', 'Product Edited', success.name + ' has been edited by admin user: ' + req.user.username);
                        req.flash('success', success.name + ' has been edited');
                        res.redirect('/products/list');
                    });
                });
            });
        });
    }
});

router.get('/delete/:productid', isLoggedIn, function(req, res, next) {
    var productid = req.params.productid;
    Product.findByIdAndUpdate(productid, {status: 'deleted'}, function(err, result) {
        log.logEvent(req.user.username, '/products/delete', 'Product Deleted', '<span style="color:red">Deleted</span>', 'Product Deleted', result.name + ' has been deleted by admin user: ' + req.user.username);
        req.flash('success', result.name + ' has been deleted');
        res.redirect('/products/list')
    });
});

//Brands//

router.get('/brands', isLoggedIn, function(req, res, next) {
    var success = req.flash('success');
    Brand.find({}).sort('name').exec(function(err, results) {
        res.render('modules/products/brands-list', { title: 'Brands', results: results, flash: success, mainactive:'products', subactive:'brands' });
    });
});

router.get('/brands/add', isLoggedIn, function(req, res, next) {
    res.render('modules/products/brands-add', { title: 'Add A Brand', mainactive:'products', subactive:'brands', csrfToken: req.csrfToken() });
});

router.post('/brands/add', isLoggedIn, function(req, res, next) {
    var file = req.files.mediafile;
    var newFilename = shortid.generate();
    var stream = fs.createReadStream(file.path);
    var newMedia = {Bucket: s3BrandBucket, Key: newFilename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};
    s3.upload(newMedia, function(err, uploaded) {
        var newBrand = new Brand ({
            name: req.body.name,
            slug: slug(req.body.name, {lower: true}),
            logofilename: newFilename + path.extname(file.originalFilename),
            logopath: decodeURIComponent(uploaded.Location),
            timestamp: moment().format(),
            addedby: req.user.id
            
        });
        newBrand.save(function(err, success) {
            fs.unlink(file.path, function() {
                log.logEvent(req.user.username, '/products/brands/add', 'Add New Brand', '<span style="color:green">Added</span>', 'Brand Added', success.name + ' has been added by admin user: ' + req.user.username);
                req.flash('success', success.name + ' successfully added');
                res.redirect('/products/brands')
            });
        });
    });
});

router.get('/brands/edit/:brandid', isLoggedIn, function(req, res, next) {
    var brandid = req.params.brandid;
    Brand.findById(brandid).exec(function(err, result) {
        res.render('modules/products/brands-edit', { title: 'Edit A Brand', mainactive:'products', subactive:'brands', csrfToken: req.csrfToken(), result: result });
    });
});

router.post('/brands/edit/:brandid', isLoggedIn, function(req, res, next) {
    var brandid = req.params.brandid;
    var file = req.files.mediafile;
    if (!file.originalFilename) {
        var editBrandNoFile = {
            name: req.body.name,
            slug: slug(req.body.name, {lower: true})
        };
        Brand.findByIdAndUpdate(brandid, editBrandNoFile, function(err, success) {
            log.logEvent(req.user.username, '/products/brands/edit', 'Edit Brand', '<span style="color:orange">Edited</span>', 'Brand Edited', success.name + ' has been edited by admin user: ' + req.user.username);
            req.flash('success', success.name + ' has been edited');
            res.redirect('/products/brands')
        });
    } else {
        var newFilename = shortid.generate();
        var stream = fs.createReadStream(file.path);
        var newMedia = {Bucket: s3BrandBucket, Key: newFilename + path.extname(file.originalFilename), ACL: 'public-read', ContentType: file.type, Body: stream};

        Brand.findById(brandid).exec(function(err, result) {
            var delMedia = {Bucket: s3BrandBucket, Key: result.logofilename};
            s3.deleteObject(delMedia, function(err, deleted) {
                s3.upload(newMedia, function(err, uploaded) {
                    var editBrandWithFile = {
                        name: req.body.name,
                        slug: slug(req.body.name, {lower: true}),
                        logofilename: newFilename + path.extname(file.originalFilename),
                        logopath: decodeURIComponent(uploaded.Location)
                    };
                    Brand.findByIdAndUpdate(brandid, editBrandWithFile).exec(function(err, success) {
                        fs.unlink(file.path, function() {
                            log.logEvent(req.user.username, '/products/brands/edit', 'Edit Brand', '<span style="color:green">Added</span>', 'Brand Edited', success.name + ' has been edited by admin user: ' + req.user.username);
                            req.flash('success', success.name + ' has been edited');
                            res.redirect('/products/brands')
                        });
                    });
                });
            });
        });
    }
});

router.get('/brands/delete/:brandid', isLoggedIn, function(req, res, next) {
    var brandid = req.params.brandid;
    Brand.findByIdAndRemove(brandid, function(err, result) {
        var delMedia = {Bucket: s3BrandBucket, Key: result.logofilename};
        s3.deleteObject(delMedia, function(err, success) {
            log.logEvent(req.user.username, '/products/brands/delete', 'Brand Deleted', '<span style="color:red">Deleted</span>', 'Brand Deleted', result.name + ' has been deleted by admin user: ' + req.user.username);
            req.flash('success', result.name + ' has been deleted');
            res.redirect('/products/brands')
        });
    });
});

// Product Tag //
// router.get('/producttags', isLoggedIn, function(req, res, next) {
//     var success = req.flash('success');
//     ProductTag.find({}).sort('name').exec(function(err, results) {
//         res.render('modules/products/producttag-list', { title: 'Product Tag', results: results, flash: success, mainactive:'products', subactive:'producttag' });
//     });
// });
//
// router.get('/producttags/add', isLoggedIn, function(req, res, next) {
//     res.render('modules/products/producttag-add', { title: 'Add A Brand', mainactive:'products', subactive:'brands', csrfToken: req.csrfToken() });
// });
//
// router.post('/producttags/add', isLoggedIn, function(req, res, next) {
//     var newProductTags = new ProductTag ({
//         name: req.body.name,
//         timestamp: moment().format(),
//         addedby: req.user.id
//     });
//     newProductTags.save(function(err, success) {
//         log.logEvent(req.user.username, '/products/producttags/add', 'Add New Product Tag', '<span style="color:green">Added</span>', 'Product Tag Added', success.name + ' has been added by admin user: ' + req.user.username);
//         req.flash('success', success.name + ' successfully added');
//         res.redirect('/products/producttags')
//         });
//     });
//
// router.get('/producttags/edit/:producttagid', isLoggedIn, function(req, res, next) {
//     var producttagid = req.params.producttagid;
//     ProductTag.findById(producttagid).exec(function(err, result) {
//         res.render('modules/products/producttag-edit', { title: 'Edit A Product Tag', mainactive:'products', subactive:'producttag', csrfToken: req.csrfToken(), result: result });
//     });
// });
//
// router.post('/producttags/edit/:producttagid', isLoggedIn, function(req, res, next) {
//
//     var producttagid = req.params.producttagid;
//     ProductTag.findOneAndUpdate({_id: producttagid}, {
//         name: req.body.name
//
//     }, function(err, success) {
//         log.logEvent(req.user.username, '/products/producttags/edit', 'Edit Product Tag', '<span style="color:green">Edited</span>', 'Product Tag Edited', success.name + ' has been edited by admin user: ' + req.user.username);
//         req.flash('success', success.name + ' has been edited');
//         res.redirect('/products/producttags')
//         });
//     });
//
// router.get('/producttags/delete/:producttagid', isLoggedIn, function(req, res, next) {
//     var producttagid = req.params.producttagid;
//     ProductTag.findByIdAndRemove(producttagid, function (err, result) {
//         log.logEvent(req.user.username, '/products/producttags/delete', 'Product Tag Deleted', '<span style="color:red">Deleted</span>', 'Product Tag Deleted', result.name + ' has been deleted by admin user: ' + req.user.username);
//         req.flash('success', result.name + ' has been deleted');
//         res.redirect('/products/producttags');
//     });
// });

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