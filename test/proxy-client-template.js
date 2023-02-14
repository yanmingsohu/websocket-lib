//
// 客户端与服务端分别启动一个端口与密码相同的进程
// 将 proxy_target 上的服务器共享到 server_url
//
var opt = {
	// 服务器的地址:端口
	server_url   : 'http://106.14.26.150:8099/',
	proxy_pw     : 'fas#@$^%nzjfg392057',
	proxy_target : 'http://localhost',
	prefix_url   : '/', 
	proxy_path   : '/',
	proxy_name : 'paas',
};


var lib;
try {
	lib = require('websocket-lib'); 
} catch(e) {
	lib = require('./index.js');
}
var cli = lib.proxyClient(opt);

cli.on('error', function(e) {
	console.log('fail:', e.message);
});

cli.on('connect', function() {
	console.log('Begin connect...');
});
		

console.log('connect to', opt.server_url, '...');
