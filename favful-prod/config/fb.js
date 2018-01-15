require('dotenv').config();

module.exports = {
    'appID' : process.env.FB_APPID,
    'appSecret' : process.env.FB_APPSECRET,
    'callbackUrl' : process.env.FB_CALLBACKURL
};