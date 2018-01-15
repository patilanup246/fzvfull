var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var validator = require('express-validator');
var flash = require('connect-flash');
var mongostore = require('connect-mongo')(session);
var async = require('async');
var _ = require('underscore');

var Cart = require('./models/cart/cart.js');
var Merchant = require('./models/merchant/merchant');
require('./config/passport');
require('dotenv').config();

var dashboard = require('./routes/dashboard/index');
var profile = require('./routes/profile/index');
var product = require('./routes/product/index');
var tutorial = require('./routes/tutorial/index');
var beautyadvisor = require('./routes/beautyadvisor/index');
var search = require('./routes/search/index');
var checkout = require('./routes/checkout/index');
var index = require('./routes/index');

var app = express();
require('./config/passport');
mongoose.connect('mongodb://' + process.env.DB_CONN);
var sessionConfig = {secret: 'pWWyVtvcafF86BaASaz4YAgaxgzMdHcVzvyScgmf', cookie: {maxAge: 1000 * 60 * 60 * 24 * 30}, resave: false, saveUninitialized: true, store: new mongostore({ mongooseConnection: mongoose.connection })}

app.get ('/*', function (req, res, next){
    var protocol = 'http' + (req.secure ? 's' : '') + '://', host = req.headers.host, href;
    if (/^www\./i.test(host)) {next();return;}
    host = 'www.' + host;
    href = protocol + host + req.url;
    res.statusCode = 301;
    res.setHeader('Location', href);
    res.write('Redirecting to ' + host + req.url + '');
    res.end();
});

if (app.get('env') === 'production') {
    app.enable('trust proxy');
    app.use(function (req, res, next) {
        if (!/https/.test(req.protocol)) {
            res.redirect("https://" + req.headers.host + req.url);
        }
        else {
            // if (!res.getHeader('Cache-Control')) {
            //     res.setHeader('Cache-Control', 'public, max-age=3600');
            // }
            return next();
        }
    });
}


app.locals.moment = require('moment');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'assets', 'favicon.ico')));
app.use(session(sessionConfig));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'assets')));

app.use(function(req, res, next) {res.locals.logged = req.user;next();});

// Shopping Cart
app.use(function(req, res, next) {
    async.parallel({
        cartDetails: function(cartDetails) {Cart.findOne({sessionID: req.sessionID, status: 'active'}).populate('merchants.items').exec(cartDetails)}
    }, function(err, results) {
        var cartDetails = results.cartDetails;
        res.locals.cartDetails = cartDetails;
        if (!cartDetails) {res.locals.cartItemCounts = '0'}
        else {
            var merchants = cartDetails.merchants;
            var items = [];
            var subTotal = 0;
            var totalQuantity = 0;

            for(var i = 0; i < merchants.length; i++) {
                items.push(merchants[i].items);
            }

            for(var i = 0; i < items.length; i++){
                var item = items[i];
                for(var j = 0; j < item.length; j++) {
                    subTotal += parseFloat((item[j].finalPrice) * item[j].quantity);
                    totalQuantity += parseFloat((item[j].quantity));
                }
            }

            var shippingFeesTotal = 0;
            for(var i = 0; i < merchants.length; i++){
                shippingFeesTotal += parseFloat((merchants[i].shippingFees));
            }

            res.locals.cartSubTotal = parseFloat(subTotal).toFixed(2);
            res.locals.cartTotalShipping = parseFloat(shippingFeesTotal).toFixed(2);
            res.locals.cartTotalPrice = parseFloat(subTotal + shippingFeesTotal).toFixed(2);
            res.locals.cartItemCounts = totalQuantity;
        }
        next();
    });
});

app.use('/dashboard', dashboard);
app.use('/profile', profile);
app.use('/products', product);
app.use('/tutorial', tutorial);
app.use('/beautyadvisor', beautyadvisor);
app.use('/search', search);
app.use('/checkout', checkout);
app.use('/', index);

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    res.redirect('/404');
});

app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
