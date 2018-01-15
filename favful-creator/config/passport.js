var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require('mongoose');
var fbConfig = require('../config/fb');
var http = require('http');
var moment = require('moment');

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
            Member.findOne({ "fb.email" : profile._json.email }, function(err, member) {
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
                            birthday: profile._json.birthday,
                            created_at: moment().format(),
                            rank: 'creator',
                            fb:{
                                id: profile.id,
                                access_token: access_token,
                                email: profile._json.email
                            }
                        };
                        Member.findOneAndUpdate({ 'fb.email' : profile._json.email }, updateCreated).exec(function(err, updated) {
                            return done(null, updated);
                        });
                    } else {
                        var updateMember = {
                            firstname: profile._json.first_name,
                            lastname: profile._json.last_name,
                            displayname: profile._json.first_name + ' ' + profile._json.last_name,
                            photo: profile._json.picture.data.url,
                            gender: profile._json.gender,
                            birthday: profile._json.birthday,
                            rank: 'creator',
                            fb:{
                                id: profile.id,
                                access_token: access_token,
                                email: profile._json.email
                            }
                        };
                        Member.findOneAndUpdate({ 'fb.email' : profile._json.email }, updateMember).exec(function(err, updated) {
                            return done(null, updated);
                        });
                    }
                } else {
                    Member.findOne({email: req.session.inviteemail}, function(err, result) {
                        if (result) {
                            var updateByInviteEmail = {
                                firstname: profile._json.first_name,
                                lastname: profile._json.last_name,
                                displayname: profile._json.first_name + ' ' + profile._json.last_name,
                                photo: profile._json.picture.data.url,
                                gender: profile._json.gender,
                                birthday: profile._json.birthday,
                                created_at: moment().format(),
                                rank: 'creator',
                                fb:{
                                    id: profile.id,
                                    access_token: access_token,
                                    email: profile._json.email
                                }
                            };
                            Member.findOneAndUpdate({ email : req.session.inviteemail }, updateByInviteEmail).exec(function(err, insert) {
                                if (err) console.log(err);
                                return done(null, insert);
                            });
                        } else {
                            var newMember = new Member({
                                firstname: profile._json.first_name,
                                lastname: profile._json.last_name,
                                displayname: profile._json.first_name + ' ' + profile._json.last_name,
                                username: username,
                                photo: profile._json.picture.data.url,
                                email: req.session.inviteemail,
                                gender: profile._json.gender,
                                birthday: profile._json.birthday,
                                created_at: moment().format(),
                                rank: 'creator',
                                fb:{
                                    id: profile.id,
                                    access_token: access_token,
                                    email: profile._json.email
                                }
                            });
                            // set all of the facebook information in our member model

                            // save our member to the database
                            newMember.save(function(err) {
                                if (err)
                                    throw err;

                                // if successful, return the new member
                                return done(null, newMember);
                            });
                        }
                    });

                }
            });
        });
    }));