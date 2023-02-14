//
// 客户端与服务端分别启动一个端口与密码相同的进程
//
var option = {
    // 客户端连接到服务端提供一个认证密码
    proxy_pw   : 'fas#@$^%nzjfg392057',
    http_port  : 8099,
}

var lib;
try {
	lib = require('websocket-lib'); 
} catch(e) {
	lib = require('./index.js');
}
var ser = lib.proxyServer(option);

ser.on('error', function(e) {
  console.log(e.message);
});

ser.begin_http_server();
