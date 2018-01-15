var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var productcategorySchema = new Schema ({
    name: String,
    slug: String,
});

module.exports = mongoose.model('ProductCategory', productcategorySchema);