var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var siteConfigSchema = new Schema ({
    licensekey: {type: String},
    owner: {
        name: {type: String},
        email: {type: String},
        phone: {type: String}
    },
    company: {
        name: {type: String},
        logo: {type: String},
        phone: {type: String},
        email: {type: String},
        address1: {type: String},
        address2: {type: String},
        city: {type: String},
        postcode: {type: String},
        state: {type: String},
        country: {type: String}
    },
    site: {
        name: {type: String},
        logo: {type: String},
        description: {type: String},
        url: {type: String}
    }
});

module.exports = mongoose.model('SiteConfig', siteConfigSchema);