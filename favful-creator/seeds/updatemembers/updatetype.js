var mongoose = require('mongoose');
var Member = require('../../models/member/member');

mongoose.connect('mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB');

Member.find({}).exec(function(err, results) {
    Member.update({}, {type: 'member'}, {multi: true}, function(err, done) {
        console.log(done);
        mongoose.disconnect();
    })
});
