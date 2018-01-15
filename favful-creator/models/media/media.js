var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mediaSchema = new Schema ({
    name: {type: String},
    slug: {type: String},
    type: {type: String},
    path: {type: String},
    timestamp: {type: String},
    uploadby: {type: Schema.Types.ObjectId, ref: 'Member'}
});

module.exports = mongoose.model('Media', mediaSchema);