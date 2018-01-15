var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var memberSchema = new Schema ({
    displayname: String,
    username: String,
    photo: String,
    email: String,
    birthday: String,
    gender: String,
    country: String,
    influence: {type: Number, default: 0},
    benefited: {type: Number, default: 0},
    shortintro: String,
    created_at: String,
    lastlogin_at: String,
    rank: String,
    trendingpoint: {type: Number, default: 0},
    type: String,
    tncagreed: Boolean,
    tncagree_at: String,
    personal: {
        firstname: String,
        lastname: String,
        fullname: String,
        address01: String,
        address02: String,
        city: String,
        state: String,
        postcode: String,
        country: String,
        countrycode: String,
        phone: String
    },
    profile: {
        skintype: String,
        skintone: String,
        agegroup: String
    },
    fb: {
        id: String,
        access_token: String,
        email: String
    },
    blog: {
        url: String,
        monthlyviews: {type: Number, default: 0}
    },
    youtube: {
        url: String,
        subscribers: {type: Number, default: 0}
    },
    instagram: {
        url: String,
        followers: {type: Number, default: 0}
    }
});

memberSchema.methods.encryptPassword = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(18), null);
};

memberSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('Member', memberSchema);