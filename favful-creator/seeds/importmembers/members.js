var mongoose = require('mongoose');
var Member = require('../../models/member/member');

var seeds = require('myjsonfile.json');

mongoose.connect('mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB');

Member.insertMany(seeds, function(err, done) {
    if (err) console.error(err);
    mongoose.disconnect();
});
