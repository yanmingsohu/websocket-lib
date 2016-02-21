var sio = require('../index.js');
var fs  = require('fs');

// 浏览器导入 ca/ca.crt 到 '受信任的机构' 中可以无提示
var option = {
    http_port: 80,   // 为 null 则不启动 http 服务
    // https_port: 443, // 为 null 则不启动 https 服务

    // https: {
    //   key  : fs.readFileSync(__dirname + '/../ca/server.key'),
    //   cert : fs.readFileSync(__dirname + '/../ca/server.crt'),
    //   passphrase: '12345' //SER_PASS
    // }
}

var ser = sio.createWSServer(option);

// ser.on(...) 为所有 socket 提供服务
ser.on('message', function (socket, msg) {
  console.log('recv', msg);
  socket.emit('message', 'hello client ');

  // socket.on(...) 为单独的 socket 提供特定服务
  // 只对当前 socket 有效
});

ser.on('test', function(socket, msg) {
  console.log('test', msg);
});

ser.request = function(req, resp) {
  console.log(req.url);
  resp.end('end');
};