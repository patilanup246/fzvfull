var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var brandSchema = new Schema ({
    name: String,
    slug: String,
    logofilename: String,
    logopath: String,
    timestamp: String,
    legacyid: String,
    addedby: {type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Brand', brandSchema);