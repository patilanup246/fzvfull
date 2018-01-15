var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var async = require('async');
var moment = require('moment');
var fs = require('fs');

var Member = require('../models/member/member');
var Tutorial = require('../models/tutorial/tutorial');
var Cart = require('../models/cart/cart');
var CartItem = require('../models/cart/cartItem');
var Product = require('../models/product/product');
var Heart = require('../models/tracker/heartlog');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    async.parallel ({
        toptutorial: function(toptutorial) {Tutorial.find({status:'active'}).populate('author products').populate({path:'products', populate: {path:'brand'}}).sort('-timestamp').limit(3).exec(toptutorial)},
        topexperts: function(topexperts) {Member.find({rank:'creator'}).sort('-influence').limit(6).exec(topexperts)},
        productlist: function(productlist) {Product.find({instore: true}).sort('-created_at').limit(3).populate('brand').exec(productlist)}
    }, function(err, results) {
        var toptutorial = results.toptutorial;
        var topexperts = results.topexperts;
        var productlist = results.productlist;
        res.render('modules/home/index', {title: 'Beauty Community for Makeup & Skincare Enthusiasts', csrfToken: req.csrfToken(), toptutorial: toptutorial, topexperts: topexperts, productlist: productlist});
    });
});

router.post('/addItemToCart', function(req, res, next) {
    var backURL = req.header('Referer') || '/';
    async.parallel({
        cart: function(cart) {Cart.findOne({sessionID: req.sessionID, status: 'active'}).populate('merchants.items').exec(cart)},
        product: function(product) {Product.findById(req.body.itemID).populate('merchant').exec(product)},
        referrer: function(referrer) {Member.findById(req.body.referrer).exec(referrer)}
    }, function(err, results) {
        var cart = results.cart;
        var product = results.product;
        if (results.referrer) {var referrer = results.referrer;}
        if (!results.referrer) {var referrer = []}
        if (product.discountedprice) {var finalPrice = product.discountedprice;}
        if (!product.discountedprice) {var finalPrice = product.price;}

        if (!cart) {
            async.waterfall([
                function(newCart) {
                    var createNewCart = new Cart({
                        merchants: {
                            merchantId: product.merchant.id,
                            companyName: product.merchant.company.name,
                            companyPhone: product.merchant.company.phone,
                            companyEmail: product.merchant.email,
                            shippingFees: product.merchant.shippingfees.local,
                            minShippingDay: product.merchant.shippingDays.localMinShippingDays,
                            maxShippingDay: product.merchant.shippingDays.localMaxShippingDays
                        },
                        sessionID: req.sessionID,
                        status: 'active'
                    });
                    createNewCart.save(function(err, success) {
                        newCart(null, success);
                    })
                },
                function(newCart, newItem) {
                    var newCartItem = new CartItem ({
                        cartId: newCart.id,
                        productId: product.id,
                        merchantId: product.merchant,
                        name: product.name,
                        slug: product.slug,
                        imagePath: product.imagepath,
                        shortDescription: product.shortdescription,
                        costPrice: product.costPrice,
                        originalPrice: product.price,
                        discountedPrice: product.discountedprice,
                        finalPrice: finalPrice,
                        quantity: '1',
                        attributes: {
                            color: req.body.color,
                            flavor: req.body.flavor,
                            design: req.body.design
                        },
                        referrer: referrer.id
                    });

                    newCartItem.save(function(err, success) {
                        newItem(null, success, newCart);
                    });
                },
                function(newItem, newCart, itemToMerchant) {
                    Cart.findOneAndUpdate({_id: newCart.id, status: 'active', 'merchants.merchantId': product.merchant.id}, {$push: {'merchants.$.items': newItem.id}}).exec(function(err, success) {
                        itemToMerchant(null, success)
                    });
                }
            ], function(err, done) {
                res.redirect(backURL);
            });
        }

        if (cart) {
            var productMerchant = JSON.stringify(product.merchant.id);
            var cartMerchants = cart.merchants;
            var merchantList = [];

            for (var i = 0; i < cartMerchants.length; i++) {
                merchantList.push(JSON.stringify(cartMerchants[i].merchantId));
            }

            if (merchantList.indexOf(productMerchant) <= -1) {
                async.waterfall([
                    function(newMerchant) {
                        var createNewMerchant = {
                            merchants: {
                                merchantId: product.merchant.id,
                                companyName: product.merchant.company.name,
                                companyPhone: product.merchant.company.phone,
                                companyEmail: product.merchant.email,
                                shippingFees: product.merchant.shippingfees.local,
                                minShippingDay: product.merchant.shippingDays.localMinShippingDays,
                                maxShippingDay: product.merchant.shippingDays.localMaxShippingDays
                            }
                        };
                        Cart.findOneAndUpdate({_id: cart.id, status: 'active'}, {$push: createNewMerchant}).exec(function(err, success) {
                            newMerchant(null, success)
                        });
                    },
                    function(newMerchant, newItem) {
                        var newCartItem = new CartItem ({
                            cartId: cart.id,
                            productId: product.id,
                            merchantId: product.merchant,
                            name: product.name,
                            slug: product.slug,
                            imagePath: product.imagepath,
                            shortDescription: product.shortdescription,
                            costPrice: product.costPrice,
                            originalPrice: product.price,
                            discountedPrice: product.discountedprice,
                            finalPrice: finalPrice,
                            quantity: '1',
                            attributes: {
                                color: req.body.color,
                                flavor: req.body.flavor,
                                design: req.body.design
                            },
                            referrer: referrer.id
                        });
                        newCartItem.save(function(err, success) {
                            newItem(null, success, newMerchant);
                        });
                    },
                    function(newItem, newMerchant, itemToMerchant) {
                        Cart.findOneAndUpdate({_id: cart.id, status: 'active', 'merchants.merchantId': product.merchant.id}, {$push: {'merchants.$.items': newItem.id}}).exec(function(err, success) {
                            itemToMerchant(null, success)
                        });
                    }
                ], function(err, done) {
                    res.redirect(backURL);
                });
            }
            else if (merchantList.indexOf(productMerchant) >= 0) {
                CartItem.findOne({cartId: cart.id, productId: product.id, 'attributes.color': req.body.color, 'attributes.flavor': req.body.flavor, 'attributes.design': req.body.design}).exec(function(err, result) {
                    if (result) {
                        CartItem.findOneAndUpdate({cartId: cart.id, productId: product.id, 'attributes.color': req.body.color, 'attributes.flavor': req.body.flavor, 'attributes.design': req.body.design}, {$inc: {quantity: 1}}).exec(function(err, success){
                            res.redirect(backURL);
                        });
                    }
                    if (!result) {
                        async.waterfall([
                            function(newItem) {
                                var newCartItem = new CartItem ({
                                    cartId: cart.id,
                                    productId: product.id,
                                    merchantId: product.merchant,
                                    name: product.name,
                                    slug: product.slug,
                                    imagePath: product.imagepath,
                                    shortDescription: product.shortdescription,
                                    costPrice: product.costPrice,
                                    originalPrice: product.price,
                                    discountedPrice: product.discountedprice,
                                    finalPrice: finalPrice,
                                    quantity: '1',
                                    attributes: {
                                        color: req.body.color,
                                        flavor: req.body.flavor,
                                        design: req.body.design
                                    },
                                    referrer: referrer.id
                                });
                                newCartItem.save(function(err, success) {
                                    newItem(null, success);
                                });
                            },
                            function(newItem, itemToMerchant) {
                                Cart.findOneAndUpdate({_id: cart.id, status: 'active', 'merchants.merchantId': product.merchant.id}, {$push: {'merchants.$.items': newItem.id}}).exec(function(err, success) {
                                    itemToMerchant(null, success)
                                });
                            }
                        ], function(err, done) {
                            res.redirect(backURL);
                        });
                    }
                });

            }
        }
    });
});

router.get('/removeItemInCart/:itemID', function(req, res, next) {
    var itemID = req.params.itemID;
    var backURL = req.header('Referer') || '/';
    async.waterfall([
        function(itemDetails) {
            CartItem.findById(itemID).populate('merchantId').exec(function(err, success) {
                itemDetails(null, success)
            });
        },
        function(itemDetails, removeItemFromCart) {
            Cart.findOneAndUpdate({_id: itemDetails.cartId, status: 'active', 'merchants.merchantId': itemDetails.merchantId.id}, {$pull: {'merchants.$.items': itemDetails.id}}).exec(function(err, success) {
                removeItemFromCart(null, success, itemDetails);
            });
        },
        function(removeItemFromCart, itemDetails, removeItemFromCartItem) {
            CartItem.findByIdAndRemove(itemDetails).exec(function(err, success) {
                removeItemFromCartItem(null, itemDetails)
            });
        },
        function(itemDetails, currentCartDetails) {
            Cart.findOne({_id: itemDetails.cartId, status: 'active'}).exec(function(err, success) {
                currentCartDetails(null, success, itemDetails)
            });
        },
        function(currentCartDetails, itemDetails, findEmptyArray) {
            var merchantArray = currentCartDetails.merchants;
            for(var i = 0; i < merchantArray.length; i++) {
                if (merchantArray[i].items.length < 1) {
                    Cart.findOneAndUpdate({_id: currentCartDetails.id, status: 'active'}, {$pull: {merchants: {_id: merchantArray[i].id}}}).exec(function(err, success) {});
                }
            }
            findEmptyArray(null)
        }
    ], function(err, done) {
        res.redirect(backURL);
    });
});

router.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email'}));

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect : '/',
        failureRedirect : '/'
    })
);

router.get('/error', function(req, res, next) {
    res.render('modules/static/error', {title: 'Error'});
});

router.get('/faq', function(req, res, next) {
    res.render('modules/static/faq', {title: 'Frequently Ask Questions'});
});

router.get('/merchant', function(req, res, next) {
    res.render('modules/static/merchant', {title: 'How it Works'});
});

router.get('/contact-us', function(req, res, next) {
    res.render('modules/static/contactus', {title: 'Contact Us'});
});

router.get('/terms-and-conditions', function(req, res, next) {
    res.render('modules/static/tnc', {title: 'Terms and Conditions'});
});

router.get('/terms-of-use', function(req, res, next) {
    res.render('modules/static/tou', {title: 'Terms of Use'});
});

router.get('/privacy-policy', function(req, res, next) {
    res.render('modules/static/privacy-policy', {title: 'Privacy Policy'});
});

router.get('/signout', function(req, res, next) {
    req.logout();
    res.redirect('/');
});

router.get('/404', function(req, res, next) {
    res.render('404', {title: 'Page Not found'});
});

router.get('/sendemail', function(req, res, next) {
    var AWS = require('aws-sdk');
    AWS.config.update({region: 'us-east-1'});
    var ses = new AWS.SES({apiVersion: '2010-12-01'});
    var mailTemplate = require('../config/email/default.json');

    var to = ['zivkong@gmail.com'];
    var from = "Allie From Favful <allie@stayfavful.com>";
    var emailSubject = 'Happy that you’re here 😃';
    var emailMessage = '<p>HUGS----<br/>So happy that you&rsquo;re here!</p><p>Welcome to the club - you are now a part of the community who&rsquo;re passionate at being the best version of ourselves and motivated to helping others being beYOUtiful.</p><p>Now that you&rsquo;re a part of us, you get to:<br/><br/></p><p style="text-align: center;">Benefit from product tutorials and recommendations</p><p style="text-align: center;"><a href="https://www.favful.com.my/tutorial" target="_blank"><button style="width: 50%; padding: 10px; background-color: #ed145b; border: 0; color: #fff; margin-top: 5px;">WATCH BEAUTY TUTORIALS NOW</button></a></p><p style="text-align: center;"><br/>Showcase and interact with beauty gurus and enthusiasts</p><p style="text-align: center;"><a href="https://www.favful.com.my/dashboard" target="_blank"><button style="width: 50%; padding: 10px; background-color: #ed145b; border: 0; color: #fff; margin-top: 5px;">EDIT PROFILE NOW </button> </a></p><p style="text-align: center;"><br/>First hand on unique products</p><p style="text-align: center;"><a href="https://www.favful.com.my/products" target="_blank"><button style="width: 50%; padding: 10px; background-color: #ed145b; border: 0; color: #fff; margin-top: 5px;">SHOP RECOMMENDED PRODUCT NOW </button> </a></p><p>&nbsp;</p><p>We&rsquo;ll have so much more beautiful time together! XO</p><p>Love,<br/>Sasha &amp; the team</p>';

    var emailConstruct = mailTemplate.header + emailMessage + mailTemplate.footer;

    ses.sendEmail( {
        Source: from,
        Destination: { ToAddresses: to },
        Message: {
            Subject: {
                Data: emailSubject
            },
            Body: {
                Html: {
                    Data: emailConstruct
                }
            }
        }
    }, function(err, data) {
        if(err) throw err;
        res.send('email sent')
    });
});

router.get('/:username', function(req, res, next) {
    var username = req.params.username;
    Member.findOne({username: new RegExp('^'+username+'$', "i")}, function(err, result) {
        if (!result) {
            res.redirect('/404')
        }
        if (result) {
            async.parallel(
                {
                    member: function(member) {Member.findById(result.id).exec(member)},
                    tutorials: function(tutorials) {Tutorial.find({author: result.id}).populate('author products').populate({path:'products', populate: {path:'brand'}}).exec(tutorials)},
                    tutorialcount: function(tutorialcount) {Tutorial.find({author: result.id, status: 'active'}).count().exec(tutorialcount)}
                }, function (err, results) {
                    var member = results.member;
                    var tutorials = results.tutorials;
                    var contributed = results.tutorialcount;
                    res.render('modules/profile/index', {title: member.displayname, csrfToken: req.csrfToken(), member: member, contributed: contributed, tutorials: tutorials});
                });
        }
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