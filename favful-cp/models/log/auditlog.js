var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var auditLogSchema = new Schema ({
    actor: {type: String},
    date: {type: String},
    origin: {type: String},
    action: {type: String},
    label: {type: String},
    object: {type: String},
    description: {type: String}
});

module.exports = mongoose.model('AuditLog', auditLogSchema);