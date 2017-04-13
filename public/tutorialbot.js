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
      displayMessage('watson', message);
    });
    emitMessage('');
  }

  // Display a user or Watson message
  function displayMessage(who, response) {
    if (who === 'watson') {
      // If it's Watson then split message into sentences for nicer display
      var sentences = response.output.text[0].split('.');
      for (var i=0; i < sentences.length; i++) {
        setTimeout(function (sentence) {
          addMessageToDom(who, sentence);
        }, 1000 * i, sentences[i]);
      }
    } else {
      addMessageToDom(who, response.output.text);
    }
  }

  // Add message to the conversation list element
  function addMessageToDom (who, message) {
    var conversationElement = document.getElementById('conversation');
    var messageElement = document.createElement('li');
    messageElement.className = who;
    messageElement.appendChild(document.createTextNode(message));
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
