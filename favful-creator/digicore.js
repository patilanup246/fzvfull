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
require('./config/passport');

var tutorial = require('./routes/tutorial/index');
var dashboard = require('./routes/dashboard/index');
var creator = require('./routes/creator/index');
var index = require('./routes/index');

var app = express();
require('./config/passport');
mongoose.connect('mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB');
var sessionConfig = {secret: 'pWWyVtvcafF86BaASaz4YAgaxgzMdHcVzvyScgmf', cookie: {maxAge: 1000 * 60 * 60 * 24 * 7}, resave: false, saveUninitialized: false, store: new mongostore({ mongooseConnection: mongoose.connection })}
if (app.get('env') === 'production') {app.set('trust proxy', 1);sess.cookie.secure = true;}
app.get ('/*', function (req, res, next){
    var protocol = 'http' + (req.connection.encrypted ? 's' : '') + '://', host = req.headers.host, href;
    if (/^www\./i.test(host)) {next();return;}
    host = 'www.' + host;
    href = protocol + host + req.url;
    res.statusCode = 301;
    res.setHeader('Location', href);
    res.write('Redirecting to ' + host + req.url + '');
    res.end();
});

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

app.use(function(req, res, next) {
    res.locals.logged = req.user;
    next();
});

app.use('/dashboard', dashboard);
app.use('/tutorial', tutorial);
app.use('/creator', creator);
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