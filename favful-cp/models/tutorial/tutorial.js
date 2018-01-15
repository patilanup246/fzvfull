var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tutorialSchema = new Schema ({
    title: String,
    slug: String,
    youtubeid: String,
    videoid: String,
    thumbnail: String,
    thumbnailpath: String,
    videofilename: String,
    videopath: String,
    shortdescription: String,
    content: String,
    products: [{type: Schema.Types.ObjectId, ref: 'Product'}],
    status: String,
    type: String,
    timestamp: String,
    heart: Number,
    author: {type: Schema.Types.ObjectId, ref: 'Member'}
});

module.exports = mongoose.model('Tutorial', tutorialSchema);