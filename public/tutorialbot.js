var tutorialbot = (function() {
  // Public methods
  return {
    initialize : initialize,
    keyPressed : keyPressed
  };

  // Web socket
  var socket;

  // Conversation context
  var context;

  // Sends initial message to start conversation
  function initialize () {
    socket = io();
    // Listen on web socket
    socket.on('event', function (message) {
      displayMessage('watson', {output: {text: message.event.name}});
    });
    emitMessage('');
  }

  // Display a user or Watson message
  function displayMessage(who, response) {
    var conversationElement = document.getElementById('conversation');

    // Create new message DOM element
    var messageElement = document.createElement('li');
    messageElement.className = who;
    messageElement.appendChild(document.createTextNode(response.output.text));
    conversationElement.append(messageElement);

    // Scroll to bottom of conversation
    conversationElement.scrollTop = conversationElement.scrollHeight;
  }

  // Send message
  function emitMessage (text) {
    var payload = {
      input : {
        text : text
      },
      context : context
    };
    socket.emit('message', payload, function (response) {
      context = response.context;
      displayMessage('watson', response);
    });
  }

  // Handles the submission of input
  function keyPressed (event, inputField) {
    // Submit on enter key, dis-allowing blank messages
    if (event.keyCode === 13 && inputField.value) {
      displayMessage('user', {output: {text: inputField.value}});
      emitMessage(inputField.value);
      // Clear input for further messages
      inputField.value = '';
    }
  }
}());
