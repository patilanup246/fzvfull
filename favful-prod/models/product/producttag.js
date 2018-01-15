var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var producttagSchema = new Schema ({
    name: String,
    slug: String,
});

module.exports = mongoose.model('ProductTags', producttagSchema);