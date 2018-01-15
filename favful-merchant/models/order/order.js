var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var orderSchema = new Schema ({
    orderId: String,
    memberId: {type: Schema.Types.ObjectId, ref: 'Member'},
    memberFullName: String,
    memberEmail: String,
    memberPhone: String,
    merchants: [{
        merchantId: {type: Schema.Types.ObjectId, ref: 'Merchant'},
        companyName: String,
        companyPhone: String,
        companyEmail: String,
        shippingFees: Number,
        minShippingDay: Number,
        maxShippingDay: Number,
        items: [{
            productId: {type: Schema.Types.ObjectId, ref: 'Product'},
            name: String,
            slug: String,
            imagePath: String,
            shortDescription: String,
            costPrice: Number,
            originalPrice: Number,
            discountedPrice: Number,
            finalPrice: Number,
            quantity: Number,
            attributes: {
                color: String,
                flavor: String,
                design: String
            },
            referrer: {type: Schema.Types.ObjectId, ref: 'Member'}
        }]
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
    paypal: {
        transactionId: String,
        paymentId: String,
        authorizationId: String,
        payerId: String,
        payerEmail: String,
        payerFirstName: String,
        payerLastName: String,
        payerStatus: String,
        amount: Number,
        currency: String
    },
    paidAmount: Number,
    createdAt: {type: Date, default: Date.now},
    status: String
});

module.exports = mongoose.model('Order', orderSchema);