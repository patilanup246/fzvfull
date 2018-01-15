var mongoose = require('mongoose');
var Member = require('../../models/member/member');

mongoose.connect('mongodb://favuser:TUbfvVyVJXDPG3TWJn93dKSxQS4ySgJWY7AnyQsT@54.255.218.50:27017/favfulDB');

var jsonObj = require('members_raw.json');

var arr = [];

for(var i = 0, len = jsonObj .length; i < len; i++) {
    arr.push( {
        "email" :  jsonObj[i].email,
        "username" :  jsonObj[i].username,
        "country" :  jsonObj[i].country,
        "fb" : {
            "email" :  jsonObj[i].facebookemail
        },
        "blog" : {
            "url" : jsonObj[i].blogurl,
            "monthlyviews" : jsonObj[i].blogmonthlyviews
        },
        "youtube" : {
            "url" : jsonObj[i].youtubelink,
            "subscribers" : jsonObj[i].youtubesubscribers
        },
        "instagram" : {
            "url" : jsonObj[i].instagramlink,
            "followers" : jsonObj[i].instagramfollowers
        }
    });
}


Member.update({}).exec(function(err, member) {


});
