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
var mongostore = require('connect-mongo')(session);
var flash = require('connect-flash');
var log = require('audit-log');

var site = require('./routes/site/index');
var user = require('./routes/user/index');
var members = require('./routes/members/index');
var tutorials = require('./routes/tutorials/index');
var products = require('./routes/products/index');
var merchants = require('./routes/merchants/index');
var orders = require('./routes/orders/index');
var statistics = require('./routes/statistics/index');
var index = require('./routes/index');

var app = express();
var mongoDB = 'mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB';
var sessionConfig = {secret: 'pWWyVtvcafF86BaASaz4YAgaxgzMdHcVzvyScgmf', cookie: {maxAge: 1000 * 60 * 60 * 24 * 30}, resave: false, saveUninitialized: false, store: new mongostore({ mongooseConnection: mongoose.connection })}

require('./config/passport');
mongoose.connect(mongoDB);
if (app.get('env') === 'production') {app.set('trust proxy', 1);sess.cookie.secure = true;}
log.addTransport("mongoose", {connectionString: mongoDB});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'assets', 'favicon.ico')));
app.use(session(sessionConfig));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(validator());
app.use(cookieParser());
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'assets')));

app.use(function(req, res, next) {res.locals.logged = req.user;next();});
app.locals.moment = require('moment');

app.use('/site', site);
app.use('/user', user);
app.use('/members', members);
app.use('/tutorials', tutorials);
app.use('/products', products);
app.use('/merchants', merchants);
app.use('/orders', orders);
app.use('/statistics', statistics);
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    res.redirect('/404');
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
