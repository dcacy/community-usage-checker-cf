/**
 * This is only used for local testing.
 */

require('dotenv').config({ silent: true, path: 'local.env' });
var debug = require('debug');
const log = debug('dpc-community-usage-checker-app');

var express = require('express');
var cfenv = require('cfenv');
var app = express();
var appEnv = cfenv.getAppEnv();

// serve static files from /public directory
app.use(express.static(__dirname + '/docs'));

const fs = require('fs');
const sslPath = __dirname + '/keys/';
const options = {
	key: fs.readFileSync(sslPath + 'privkey2.pem'),
	cert: fs.readFileSync(sslPath + 'fullchain2.pem')
};
const https = require('https');
https.createServer(options, app).listen(appEnv.port, '0.0.0.0', function () {
	log('secure local server starting on', appEnv.url);
});