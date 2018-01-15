var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require('mongoose');
var fbConfig = require('../config/fb');
var http = require('http');
var moment = require('moment');
var AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});
var ses = new AWS.SES({apiVersion: '2010-12-01'});
var mailTemplate = require('../config/email/default.json');

var Member = require('../models/member/member');

var username = mongoose.Types.ObjectId();

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    Member.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use('facebook', new FacebookStrategy({
        clientID        : fbConfig.appID,
        clientSecret    : fbConfig.appSecret,
        callbackURL     : fbConfig.callbackUrl,
        profileFields: ['id', 'first_name', 'last_name', 'emails', 'gender', 'picture.type(large)', 'friends', 'birthday'],
        enableProof: true,
        passReqToCallback: true
    },

    function(req, access_token, refresh_token, profile, done) {
        process.nextTick(function() {
            Member.findOne({ "fb.id" : profile._json.id }, function(err, member) {
                if (err)
                    return done(err);
                if (member) {
                    if (!member.created_at) {
                        var updateCreated = {
                            firstname: profile._json.first_name,
                            lastname: profile._json.last_name,
                            displayname: profile._json.first_name + ' ' + profile._json.last_name,
                            photo: profile._json.picture.data.url,
                            gender: profile._json.gender,
                            created_at: moment().format(),
                            lastlogin_at: moment().format(),
                            fb:{
                                id: profile.id,
                                access_token: access_token,
                                email: profile._json.email
                            },
                            tncagreed: true,
                            tncagree_at: moment().format()
                        };
                        Member.findOneAndUpdate({ 'fb.od' : profile._json.id }, updateCreated).exec(function(err, updated) {
                            return done(null, updated);
                        });
                    } else {
                        var updateMember = {
                            firstname: profile._json.first_name,
                            lastname: profile._json.last_name,
                            displayname: profile._json.first_name + ' ' + profile._json.last_name,
                            photo: profile._json.picture.data.url,
                            gender: profile._json.gender,
                            lastlogin_at: moment().format(),
                            fb:{
                                id: profile.id,
                                access_token: access_token,
                                email: profile._json.email
                            },
                            tncagreed: true,
                            tncagree_at: moment().format()
                        };
                        Member.findOneAndUpdate({ 'fb.id' : profile._json.id }, updateMember).exec(function(err, updated) {
                            return done(null, updated);
                        });
                    }
                } else {
                        var newMember = new Member({
                            firstname: profile._json.first_name,
                            lastname: profile._json.last_name,
                            displayname: profile._json.first_name + ' ' + profile._json.last_name,
                            username: username,
                            email: profile._json.email,
                            photo: profile._json.picture.data.url,
                            email: req.session.inviteemail,
                            gender: profile._json.gender,
                            created_at: moment().format(),
                            lastlogin_at: moment().format(),
                            fb:{
                                id: profile.id,
                                access_token: access_token,
                                email: profile._json.email
                            },
                            tncagreed: true,
                            tncagree_at: moment().format()
                        });
                        // set all of the facebook information in our member model

                        // save our member to the database
                        newMember.save(function(err) {
                            if (err)
                                throw err;
                            var to = [profile._json.email];
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
                                return done(null, newMember);
                            });
                        });
                        }
                });
            });
    }));