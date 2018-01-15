var jsonObj = require('members_raw.json');
var fs = require('fs');

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

fs.writeFile('myjsonfile.json', JSON.stringify(arr), function(err, done) {
    if (err) console.error(err);
    console.log(done)
});

