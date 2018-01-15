var mongoose = require('mongoose');
var Member = require('../../models/member/member');
var fs = require('fs');
var moment = require('moment');

mongoose.connect('mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB');

Member.find({}).exec(function(err, results) {
    fs.writeFile('backup_'+ moment().format() +'.json', JSON.stringify(results), function(err, done) {
        if (err) console.error(err);
        console.log(done);
        mongoose.disconnect();
    });
});
