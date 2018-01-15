var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var productSchema = new Schema ({
    name: String,
    slug: String,
    imagefilename: String,
    imagefiletype: String,
    imagepath: String,
    videopath: String,
    videothumbnail: String,
    youtubeembed: String,
    shortdescription: String,
    details: String,
    maincategory: String,
    subcategory: String,
    tags: [String],
    brand: {type: Schema.Types.ObjectId, ref: 'Brand'},
    attribute: {
        skintype: [{type: String, default: null}],
        flavor: [{type: String, default: null}],
        color: [{type: String, default: null}],
        design: [{type: String, default: null}]
    },
    ingredient: String,
    volume: String,
    merchant: {type: Schema.Types.ObjectId, ref: 'Merchant'},
    costPrice: Number,
    price: Number,
    discountedprice: Number,
    redeempoint: Number,
    rating: Number,
    featured: Boolean,
    created_at: String,
    updated_at: String,
    addedby: {type: Schema.Types.ObjectId, ref: 'User'},
    instore: Boolean,
    legacyid: Number,
    status: String
});

module.exports = mongoose.model('Product', productSchema);