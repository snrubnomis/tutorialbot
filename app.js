'use strict';

// Configure dotenv to get environment variables
require('dotenv').config();

var winston = require('winston');
winston.level = 'debug';

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

var context = null;

// Watson Conversation
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var conversation = new ConversationV1({
  username : process.env.username,
  password : process.env.password,
  version_date : '2017-02-03'
});

messagehubConfig()
  .then(setupEvents)
  .then(setupApp);

function setupEvents (mqlightClient) {

  var subTopic = 'mqlight/tutorial/#';
  var subOpts = {credit : 32, autoConfirm : false, qos : 1};

  mqlightClient.on('message', handleMqMessage);

  
  mqlightClient.subscribe(subTopic, subOpts, function (err) {
    if (err) {
      winston.error('Failed to subscribe to: ', subTopic, err);
    } else {
      winston.info('Subscribed to topic', subTopic);
    }
  });

  return new Promise (function (resolve, reject) {
    resolve(mqlightClient);
  });

}

function setupApp (mqlightClient) {

  // Enable body parsing
  app.use(bodyParser.urlencoded({ extended : false }));
  app.use(bodyParser.json());

  // Serve the files out of ./public as our main files
  app.use(express.static(__dirname + '/public'));

  // Get the app environment from Cloud Foundry
  var appEnv = cfenv.getAppEnv();

  // Start socket.io
  io.on('connection', function (socket) {
    socket.on('message', handleClientMessage);
  });

  // Start server
  http.listen(appEnv.port, '0.0.0.0', function () {
    winston.info('server starting on ' + appEnv.url);
  });
}

function handleMqMessage (data, delivery) {

  console.log('handleMqMessage', data);

  var event = data;

  if (typeof event === 'string') {
    event = JSON.parse(data);
  }

  //Construct a conversation message
  var payload = {
    workspace_id : process.env.WORKSPACE_ID,
    context : Object.assign({}, context), // last context for this instance
    input : {
      event : event
    }
  };

  // Send message to Conversation service
  conversation.message(payload, handleConversationResponse);
  
}

function handleConversationResponse (err, data) {

  console.log('handleConversationResponse', err, data);

  if (err) {
    var output = {};
    output.context = Object.assign({}, context);
    output.text = 'An error occured processing an event in conversation: ' + err;
    context = null;
    return io.emit('event', output);  
  }

  // Stash a copy of the context
  context = Object.assign({}, data.context);

  return io.emit('event', data);
}

function handleClientMessage (message, fn) {
  console.log('handleClientMessage', message);

  // Setup payload
  var payload = {
    workspace_id : process.env.WORKSPACE_ID,
    context : Object.assign({}, context),
    input : message.input
  };

  // Send message to Conversation service
  conversation.message(payload,
    function (err, data) {

      console.log('handleClientMessage conversation response', data);

      if (err) {
        return io.emit('message', err);
      }

      context = Object.assign({}, data.context);

      return fn(data);
    }
  );
}
