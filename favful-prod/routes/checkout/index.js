var express = require('express');
var router = express.Router();
var passport = require('passport');
var csrf = require('csurf');
var braintree = require('braintree');
var moment = require('moment');
var orderid = require('order-id')('912268874ba3714ca7891bf4e21b7f4f');
var countries = require('country-data').countries;
var countrieslookup = require('country-data').lookup;
var AWS = require('aws-sdk');
var async = require('async');

var ses = new AWS.SES({apiVersion: '2010-12-01'});
var mailTemplate = require('../../config/email/default.json');
var accessToken = String(process.env.PAYPAL_TOKEN);

var gateway = braintree.connect({
    accessToken: accessToken
});

var Member = require('../../models/member/member');
var Order = require('../../models/order/order');
var Fulfillment = require('../../models/order/fulfilment');
var Cart = require('../../models/cart/cart.js');

var csrfProtection = csrf({cookie: true});
router.use(csrfProtection);

router.get('/', function(req, res, next) {
    if (req.user)
        gateway.clientToken.generate({}, function (err, paypalToken) {
            var paypalClientToken = paypalToken.clientToken;
            var countrylist = countries.all;
            Member.findById(req.user.id).exec(function(err, member) {
                res.render('modules/checkout/index', {title: 'Check Out', paypalClientToken: paypalClientToken, csrfToken: req.csrfToken(), member: member, countrylist: countrylist, environment: process.env.PAYPAL_ENV});
            });
        });
    if (!req.user)
        res.redirect('/error')

});

router.post('/updateUserDetails', isLoggedIn, function(req, res, next) {
    var backURL = req.header('Referer') || '/';
    var countryName = countrieslookup.countries({alpha2: req.body.country});
    var updateMember = {
        email: req.body.email,
        personal: {
            fullname: req.body.fullname,
            phone: req.body.phone,
            address01: (req.body.address01).replace(/,\s*$/, ""),
            address02: req.body.address02.replace(/,\s*$/, ""),
            city: req.body.city,
            state: req.body.state,
            postcode: req.body.postcode,
            countrycode: req.body.country,
            country: countryName[0].name
        }
    };
    Member.findByIdAndUpdate(req.user.id, updateMember).exec(function(err, result) {
        res.redirect(backURL);
    });
});

router.get('/processing', isLoggedIn, function(req, res, next) {
    var nonce = req.query.nonce;
    console.log(nonce)
    var saleRequest = {
        amount: res.locals.cartTotalPrice,
        merchantAccountId: "MYR",
        paymentMethodNonce: nonce
    };

    gateway.transaction.sale(saleRequest, function (err, result) {
        var cartDetails = res.locals.cartDetails;
        var userDetails = res.locals.logged;
        if (err) {
            res.send("<h1>Error:  " + err + "</h1>");
        } else if (result.success) {
            async.waterfall([
                function(newOrder) {
                    var createNewOrder = new Order ({
                        orderId: orderid.generate(),
                        memberId: userDetails.id,
                        memberFullName: userDetails.personal.fullname,
                        memberEmail: userDetails.email,
                        memberPhone: userDetails.personal.phone,
                        shipTo: {
                            fullName: userDetails.personal.fullname,
                            address01: userDetails.personal.address01,
                            address02: userDetails.personal.address02,
                            city: userDetails.personal.city,
                            state: userDetails.personal.state,
                            postalCode: userDetails.personal.postcode,
                            country: userDetails.personal.country,
                            countryCode: userDetails.personal.countrycode,
                            phone: userDetails.personal.phone
                        },
                        paypal: {
                            transactionId: result.transaction.id,
                            paymentId: result.transaction.paypal.paymentId,
                            authorizationId: result.transaction.paypal.authorizationId,
                            payerId: result.transaction.paypal.payerId,
                            payerEmail: result.transaction.paypal.payerEmail,
                            payerFirstName: result.transaction.paypal.payerFirstName,
                            payerLastName: result.transaction.paypal.payerLastName,
                            payerStatus: result.transaction.paypal.payerStatus,
                            amount: result.transaction.paypal.amount,
                            currency: result.transaction.currencyIsoCode
                        },
                        paidAmount: result.transaction.amount,
                        status: 'active'
                    });
                    createNewOrder.save(function(err, success) {
                        newOrder(null, success);
                    });
                },
                function(newOrder, addMerchantToOrder) {
                    var cartMerchants = cartDetails.merchants;
                    var merchantArray = 0;
                    for(var i = 0; i < cartMerchants.length; i++) {
                        var cartMerchantItems = cartMerchants[i].items;
                        var itemList = [];
                        for(var j = 0; j < cartMerchantItems.length; j++) {
                            itemList.push(
                                {
                                    productId: cartMerchantItems[j].productId,
                                    name: cartMerchantItems[j].name,
                                    slug: cartMerchantItems[j].slug,
                                    imagePath: cartMerchantItems[j].imagePath,
                                    shortDescription: cartMerchantItems[j].shortDescription,
                                    costPrice: cartMerchantItems[j].costPrice,
                                    originalPrice: cartMerchantItems[j].originalPrice,
                                    discountedPrice: cartMerchantItems[j].discountedPrice,
                                    finalPrice: cartMerchantItems[j].finalPrice,
                                    quantity: cartMerchantItems[j].quantity,
                                    attributes: {
                                        color: cartMerchantItems[j].attributes.color,
                                        flavor: cartMerchantItems[j].attributes.flavor,
                                        design: cartMerchantItems[j].attributes.design
                                    }
                                }
                            )
                        }

                        var pushMerchant = {
                            merchantId: cartMerchants[i].merchantId,
                            companyName: cartMerchants[i].companyName,
                            companyPhone: cartMerchants[i].companyPhone,
                            companyEmail: cartMerchants[i].companyEmail,
                            shippingFees: cartMerchants[i].shippingFees,
                            minShippingDay: cartMerchants[i].minShippingDay,
                            maxShippingDay: cartMerchants[i].maxShippingDay,
                            items: itemList
                        };
                        Order.findByIdAndUpdate(newOrder.id, {$push: {merchants: pushMerchant}}, function(err, completed) {
                            merchantArray += 1;
                            if (merchantArray === cartMerchants.length) {
                                Order.findById(newOrder.id).exec(function(err, success) {
                                    addMerchantToOrder(null, success, newOrder);
                                });
                            }
                        });
                    }
                },
                function(addMerchantToOrder, newOrder, sendEmailToMember) {
                    Order.findById(newOrder.id).exec(function(err, result) {
                        AWS.config.update({region: 'us-east-1'});
                        var to = [result.memberEmail];
                        var from = "Favful <hello@stayfavful.com>";
                        var emailSubject = 'Order Confirmation';
                        var emailMessage = 'Sweet! You’ve got yourself some awesome stuff, we’re sure you going to have so much fun with them.<br><br>Find all the details about your order below, and we’ll send you shopping confirmation emails as soon as your order ships.<br><br><br><table style="width:100%;text-align:center;border-collapse:collapse;border-spacing:0"><tr><th style="width:50%;border:1px solid #dadada;padding:10px"><b>Order ID</b></th> <th style="width:50%;border:1px solid #dadada;padding:10px"><b>Order Date</b></th></tr><tr><td style="width:50%;border:1px solid #dadada;padding:10px">' + result.orderId + '</td><td style="width:50%;border:1px solid #dadada;padding:10px">' + moment(result.createdAt).format("DD MMMM YYYY") + '</td></tr></table><br><br><b><u>Your order will be delivered to:</u></b><br>Name: ' + result.shipTo.fullName + '<br>Address: ' + result.shipTo.address01 + ', ' + result.shipTo.address02 + ', ' + result.shipTo.city + ', ' + result.shipTo.postalCode + ' ' + result.shipTo.state + ', ' + result.shipTo.country + '.' + '<br>Phone: ' + result.shipTo.phone + '<br><br><br>';
                        var emailSummary = '<br><br><div style="text-align:right">Sub-Total: MYR ' + res.locals.cartSubTotal + '<br>Shipping Fees: MYR ' + res.locals.cartTotalShipping + '<br><b>Total: MYR ' + res.locals.cartTotalPrice + '</b></div>';
                        var emailData = [];

                        var merchants = result.merchants;

                        for(var i = 0; i < merchants.length; i++) {
                            var merchantItems = merchants[i].items;
                            var merchantItemList = [];

                            for(var j = 0; j < merchantItems.length; j++) {
                                merchantItemList.push(
                                    '<tr style="border:1px solid #dadada"><td style="padding:10px" width="20%"><img alt="' + merchantItems[j].name + '" src="' + merchantItems[j].imagePath + '" width="100%"></td><td style="padding:10px" width="60%"><b>' + merchantItems[j].name + '</b><br><p>' + merchantItems[j].shortDescription+ '</p></td><td style="padding:10px" width="20%"><b>MYR ' + parseFloat(merchantItems[j].finalPrice).toFixed(2) + '</b></td></tr>'
                                );
                            }

                            emailData.push(
                                '<table style="width:100%;border-collapse:collapse;border-spacing:0"><tbody><tr><td colspan="3" style="border:1px solid #dadada;padding:10px;background-color:#FCE4EC">Shipment Fulfillment By: ' + merchants[i].companyName + '</td></tr><tr><td colspan="3" style="border:1px solid #dadada;padding:10px;background-color:#FCE4EC;font-size:0.7em">Delivery: ' + moment().add(merchants[i].minShippingDay, 'days').format('DD MMMM YYYY') + ' - ' + moment().add(merchants[i].maxShippingDay, 'days').format('DD MMMM YYYY') + '</td></tr>' + merchantItemList + '</tbody></table>'
                            );
                        }

                        var emailConstruct = mailTemplate.header + emailMessage + emailData + emailSummary + mailTemplate.footer;

                        ses.sendEmail({
                            Source: from,
                            Destination: {ToAddresses: to},
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
                        }, function (err, data) {
                            Order.findById(newOrder.id).exec(function (err, success) {
                                sendEmailToMember(null, addMerchantToOrder, newOrder);
                            });
                        });
                    });
                },
                function(addMerchantToOrder, newOrder, addFulfillment) {
                    console.log(addMerchantToOrder.merchants);
                    var merchantList = addMerchantToOrder.merchants;
                    var arrayCount = 0;
                    for(var i = 0; i < merchantList.length; i++) {
                        var newFulfillment = new Fulfillment ({
                            orderId: newOrder.orderId,
                            merchant: merchantList[i].merchantId,
                            merchantCompanyName: merchantList[i].companyName,
                            merchantEmail: merchantList[i].companyEmail,
                            merchantPhone: merchantList[i].companyPhone,
                            memberId: newOrder.memberId,
                            memberFullName: newOrder.memberFullName,
                            memberEmail: newOrder.memberEmail,
                            memberPhone: newOrder.memberPhone,
                            items: merchantList[i].items,
                            shipTo: {
                                fullName: newOrder.shipTo.fullName,
                                address01: newOrder.shipTo.address01,
                                address02: newOrder.shipTo.address02,
                                city: newOrder.shipTo.city,
                                state: newOrder.shipTo.state,
                                postalCode: newOrder.shipTo.postalCode,
                                country: newOrder.shipTo.country,
                                countryCode: newOrder.shipTo.countryCode,
                                phone: newOrder.shipTo.phone
                            },
                            minShippingDate: moment().add(merchantList[i].minShippingDay, 'days'),
                            maxShippingDate: moment().add(merchantList[i].maxShippingDay, 'days'),
                            shippingFees: merchantList[i].shippingFees,
                            status: 'Pending Fulfillment'
                        });
                        newFulfillment.save(function(err, fulfillment) {
                            AWS.config.update({region: 'us-east-1'});
                            var to = [fulfillment.merchantEmail];
                            var from = "Favful <hello@stayfavful.com>";
                            var emailSubject = 'You got an order from Favful!';
                            var emailMessage = 'Hi ' + fulfillment.merchantCompanyName + ',<br><br>Please prepare and ship the order within 24 hours (working day):<br><br><b>' + fulfillment.shipTo.fullName + '</b><br>' + fulfillment.shipTo.phone + '<br>' + fulfillment.shipTo.address01 + '<br>' + fulfillment.shipTo.address02 + '<br>'+ fulfillment.shipTo.city + ', ' + fulfillment.shipTo.postalCode + ' ' + fulfillment.shipTo.state + '<br>' + fulfillment.shipTo.country + '<br><br>';
                            var merchantItems = fulfillment.items;

                            var merchantItemList = [];

                            for(var j = 0; j < merchantItems.length; j++) {
                                if ((!merchantItems[j].attributes.color) || (!merchantItems[j].attributes.flavor) || (!merchantItems[j].attributes.design)) {
                                    var attribute = '';
                                }
                                if (merchantItems[j].attributes.color) {
                                    var attribute = 'Color: ' + merchantItem[j].attributes.color;
                                }
                                if (merchantItems[j].attributes.flavor) {
                                    var attribute = 'Flavor: ' + merchantItem[j].attributes.flavor;
                                }
                                if (merchantItems[j].attributes.design) {
                                    var attribute = 'Design: ' + merchantItem[j].attributes.design;
                                }
                                merchantItemList.push(
                                    '<tr style="border:1px solid #dadada"><td style="padding:10px" width="20%"><img alt="' + merchantItems[j].name + '" src="' + merchantItems[j].imagePath + '" width="100%"></td><td style="padding:10px" width="60%"><b>' + merchantItems[j].name + '</b><br><p>' + attribute + '</p></td><td style="padding:10px;text-align:center" width="20%"><b>Quantity:<br><br>' + merchantItems[j].quantity + '</b></td></tr>'
                                );
                            }

                            var emailData = ['<table style="width:100%;border-collapse:collapse;border-spacing:0"><tbody><tr><td colspan="3" style="border:1px solid #dadada;padding:10px;background-color:#FCE4EC">Order ID: ' + fulfillment.orderId + '</td></tr><tr><td colspan="3" style="border:1px solid #dadada;padding:10px;background-color:#FCE4EC;font-size:0.7em">Expected Delivery Reach: <b>' + moment().add(fulfillment.minShippingDay, 'days').format('DD MMMM YYYY') + ' - ' + moment().add(fulfillment.maxShippingDay, 'days').format('DD MMMM YYYY') + '</b></td></tr>' + merchantItemList + '</tbody></table>'];
                            var emailSummary = ["<br><br><b>Please enter tracking code here once you've shipped, we'll send delivery details to the customers.</b>"];


                            var emailConstruct = mailTemplate.header + emailMessage + emailData + emailSummary + mailTemplate.footer;

                            ses.sendEmail({
                                Source: from,
                                Destination: {ToAddresses: to},
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
                            }, function (err, data) {
                                arrayCount += 1;
                                if (arrayCount === merchantList.length) {
                                    addFulfillment(null, newOrder)
                                }
                            });
                        });
                    }
                },
                function(newOrder, cartSuccess) {
                    req.session.cartsuccess = newOrder.id;
                    Cart.findOneAndUpdate({sessionID: req.sessionID, status: 'active'}, {status: 'purchased'}, function(err, complete) {
                        cartSuccess(null, complete)
                    });
                }
            ], function(err, done) {
                res.redirect('/checkout/thank-you');
            });
        } else {
            res.send("<h1>Error:  " + result.message + "</h1>");
        }
    });
});

router.get('/thank-you', isLoggedIn, function(req, res, next) {
    Order.findById(req.session.cartsuccess).populate('merchants.items').exec(function(err, result) {
        res.render('modules/checkout/thankyou', {title: 'Thank you', result: result});
    });
});

router.get('/formdeliveryaddress', isLoggedIn, function(req, res, next) {
    res.render('modules/checkout/formshoppingcart', {title: 'Thank you'});
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