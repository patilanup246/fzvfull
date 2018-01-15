var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate')(mongoose);

var cartSchema = new Schema ({
    merchants: [{
        merchantId: {type: Schema.Types.ObjectId, ref: 'Merchant'},
        companyName: String,
        companyPhone: String,
        companyEmail: String,
        shippingFees: Number,
        minShippingDay: Number,
        maxShippingDay: Number,
        items: [{type: Schema.Types.ObjectId, ref: 'CartItem'}]
    }],
    sessionID: String,
    status: String,
    createdAt: {type: Date, expires: '90d', default: Date.now}
});

cartSchema.plugin(deepPopulate);
module.exports = mongoose.model('Cart', cartSchema);