var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fulfillmentSchema = new Schema ({
    orderId: String,
    merchant: {type: Schema.Types.ObjectId, ref: 'Merchant'},
    merchantCompanyName: String,
    merchantEmail: String,
    merchantPhone: String,
    memberId: {type: Schema.Types.ObjectId, ref: 'Member'},
    memberFullName: String,
    memberEmail: String,
    memberPhone: String,
    items: [{
        productId: {type: Schema.Types.ObjectId, ref: 'Product'},
        name: String,
        slug: String,
        imagePath: String,
        costPrice: Number,
        originalPrice: Number,
        discountedPrice: Number,
        finalPrice: Number,
        quantity: Number,
        attributes: {
            color: String,
            flavor: String,
            design: String
        }
    }],
    shipTo: {
        fullName: String,
        address01: String,
        address02: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        countryCode: String,
        phone: String
    },
    trackingCode: String,
    courierService: String,
    minShippingDate: Date,
    maxShippingDate: Date,
    shippingFees: Number,
    createdAt: {type: Date, default: Date.now},
    updatedAt: Date,
    status: String
});

module.exports = mongoose.model('Fulfillment', fulfillmentSchema);