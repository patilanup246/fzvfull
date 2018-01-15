var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var tutorialSchema = new Schema ({
    title: String,
    slug: String,
    thumbnail: String,
    videoid: String,
    videopath: String,
    shortdescription: String,
    content: String,
    type: String,
    timestamp: String,
    status: String,
    author: {type: Schema.Types.ObjectId, ref: 'Member'}
});

module.exports = mongoose.model('Tutorial', tutorialSchema);