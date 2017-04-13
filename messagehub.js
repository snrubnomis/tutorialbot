'use strict';

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var mqlight = require('mqlight');
var uuid = require('node-uuid');
var winston = require('winston');

var SERVICE_NAME = 'messagehub';

// Get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Establish credentials
var opts = {};

var service = appEnv.getService(SERVICE_NAME);

if (service) {
  opts.service = service.credentials.mqlight_lookup_url;
  opts.user = service.credentials.user;
  opts.password = service.credentials.password;

  if (!opts.hasOwnProperty('service') ||
      !opts.hasOwnProperty('user') ||
      !opts.hasOwnProperty('password')) {
    throw new Error('Error - Check that app is bound to service');
  }
}
else if (process.env.MQLIGHT_LOOKUP_URL &&
           process.env.MQLIGHT_USER &&
           process.env.MQLIGHT_PASSWORD) {
  opts.service = process.env.MQLIGHT_LOOKUP_URL;
  opts.user = process.env.MQLIGHT_USER;
  opts.password = process.env.MQLIGHT_PASSWORD;
} else {
  opts.service = 'amqp://localhost:5672';
}

opts.id = 'TUTORIALBOT_' + uuid.v4().substring(0, 7);

function config () {
  return new Promise (function (resolve, reject) {

    winston.info('config', opts);

    var mqlightClient = mqlight.createClient(opts, function (err) {
      if (err) {
        winston.error('Connection to ' + opts.service + ' using client-id ' +
          mqlightClient.id + ' failed: ' + err);
        reject(err);
      } else {
        winston.info('Connected to ' + opts.service + ' using client-id ' +
          mqlightClient.id);
      }

      mqlightClient.on('error', handleError);

      resolve(mqlightClient);

    });

  });
}

//Generic message error handler
function handleError (err) {
  winston.error(err);
}

module.exports = config;