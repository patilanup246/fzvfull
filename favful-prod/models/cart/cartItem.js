var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var cartItemSchema = new Schema ({
    cartId: {type: Schema.Types.ObjectId, ref: 'Cart'},
    productId: {type: Schema.Types.ObjectId, ref: 'Product'},
    merchantId: {type: Schema.Types.ObjectId, ref: 'Merchant'},
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
    referrer: {type: Schema.Types.ObjectId, ref: 'Member'},
    createdAt: {type: Date, expires: '90d', default: Date.now}
});

module.exports = mongoose.model('CartItem', cartItemSchema);