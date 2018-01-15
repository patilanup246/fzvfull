var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var heartlogSchema = new Schema ({
    tutorial: {type: Schema.Types.ObjectId, ref: 'Tutorial'},
    member: {type: Schema.Types.ObjectId, ref: 'Member'},
    timestamp: String
});

module.exports = mongoose.model('HeartLog', heartlogSchema);