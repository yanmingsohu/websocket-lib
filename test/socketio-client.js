var sio = require('../index.js');
var fs = require('fs');


var msg = 'hello server';
var count = 1;

var socket = sio.createWSClient('http://192.168.7.144');


socket.on('message', function(_msg) {
    console.log('recv:', _msg);
    setTimeout(send, 1000);
});

function send() {
  var m = msg +' '+ (count++);
  socket.emit('message', m);
  socket.emit('test', m);
}

send();