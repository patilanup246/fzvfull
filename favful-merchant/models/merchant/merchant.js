var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var merchantSchema = new Schema ({
    username: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    company: {
        name: String,
        regnumber: String,
        address01: String,
        address02: String,
        city: String,
        state: String,
        country: String,
        postcode: String,
        phone: String
    },
    contactperson: {
        firstname: String,
        lastname: String,
        position: String,
        mobile: String
    },
    bank: {
        name: String,
        swift: String,
        country: String,
        accountname: String,
        accountnumber: String
    },
    payment: {
        terms: String,
        salesComission: {type: Number, default: 1}
    },
    shippingfees: {
        local: Number,
        international: Number
    },
    shippingDays: {
        localMinShippingDays: {type: Number, default: 3},
        localMaxShippingDays: {type: Number, default: 7},
        intMinShippingDays: {type: Number, default: 15},
        intMaxShippingDays: {type: Number, default: 30}
    },
    created_at: String,
    status: String
});

merchantSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('Merchant', merchantSchema);