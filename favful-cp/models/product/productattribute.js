var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var productattributeSchema = new Schema ({
    name: String,
    slug: String,
});

module.exports = mongoose.model('ProductAttribute', productattributeSchema);