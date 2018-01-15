var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var memberSchema = new Schema ({
    firstname: String,
    lastname: String,
    displayname: String,
    username: String,
    photo: String,
    email: String,
    birthday: {type: String, default: ''},
    gender: String,
    country: {type: String, default: ''},
    influence: {type: Number, default: ''},
    oneliner: {type: String, default: ''},
    created_at: {type: String},
    lastlogin_at: {type: String},
    rank: {type: String},
    type: {type: String},
    profile: {
        skintype: {type: String, default: ''},
        skincolor: {type: String, default: ''}
    },
    fb: {
        id: String,
        access_token: String,
        email: String
    },
    blog: {
        url: {type: String, default: ''},
        monthlyviews: {type: Number, default: ''}
    },
    youtube: {
        url: {type: String, default: ''},
        subscribers: {type: Number, default: ''}
    },
    instagram: {
        url: {type: String, default: ''},
        followers: {type: Number, default: ''}
    }
});

memberSchema.methods.encryptPassword = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(18), null);
};

memberSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('Member', memberSchema);