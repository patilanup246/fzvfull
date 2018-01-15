var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var userSchema = new Schema ({
    username: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    photo: {type: String},
    displayname: {type: String},
    firstname: {type: String},
    lastname: {type: String},
    phone: {type: String},
    address: {
        address1: {type: String},
        address2: {type: String},
        city: {type: String},
        postcode: {type: String},
        state: {type: String},
        country: {type: String}
    },
    permissions: [{type: String}],
    status: {type: String}
});

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);