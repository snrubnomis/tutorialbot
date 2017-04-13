'use strict';

// Configure dotenv to get environment variables
require('dotenv').config();

var messagehubConfig = require('./messagehub');

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var bodyParser = require('body-parser');

// Create a new express server
var app = express();

// socket.io
var http = require('http').Server(app);
var io = require('socket.io')(http);

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// Watson Conversation
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var conversation = new ConversationV1({
  username: process.env.username,
  password: process.env.password,
  version_date: '2017-02-03'
});

messagehubConfig().then(setup);

function setup (mqlightClient) {

  // Enable body parsing
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // Serve the files out of ./public as our main files
  app.use(express.static(__dirname + '/public'));

  // Get the app environment from Cloud Foundry
  var appEnv = cfenv.getAppEnv();

  var messageReceived = function (message, fn) {
    // Setup payload
    var payload = {
      workspace_id: process.env.WORKSPACE_ID,
      context: message.context,
      input: message.input
    };

    // Send message to Conversation service
    conversation.message(payload,
      function (err, data) {
        if (err) {
          return io.emit('message', err);
        }
        return fn(data);
      }
    );
  }

  // Start socket.io
  io.on('connection', function (socket) {
    socket.on('message', messageReceived);
  });

  // Start server
  http.listen(appEnv.port, '0.0.0.0', function() {
    console.log("server starting on " + appEnv.url);
  });
}
