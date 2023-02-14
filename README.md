# Web Socket 便捷封装

## install

`npm install websocket-lib --save`


## 代理功能

* test/proxy-client-template.js
* test/proxy-server-template.js

这是代理服务器/客户端的启动模板, 修改后可以直接使用.


## Web Socket 库

### Client

```js
var option = {
  proxy_pw : '',   // 与服务端相同的认证密码, 密码错误无法连接
}
var sio = require('websocket-lib');
var client = sio.createWSClient('http://localhost', option);

// 等待接收消息
client.on('message', function(_msg) { ... });
// 发送消息
client.emit('msgname', data)
```

### Server

```js
// 浏览器导入 ca/ca.crt 到 '受信任的机构' 中可以无提示
var option = {
    // 两个选项, 必须启用一个
    http_port: 80,   // 为 null 则不启动 http 服务
    https_port: 443, // 为 null 则不启动 https 服务
    proxy_pw : '',   // 与客户端相同的认证密码, 密码错误无法连接

    // 当 https_port 被配置的时候, 可以指定这些参数
    https: {
      key  : fs.readFileSync(__dirname + '/../ca/server.key'),
      cert : fs.readFileSync(__dirname + '/../ca/server.crt'),
      passphrase: '12345' // 证书的密码
    }
}

var ser = sio.createWSServer(option);

// ser.on(...) 为所有 socket 提供服务
ser.on('message', function (socket, msg) {
  // 每个 socket 是一个对客户端的连接
  socket.on(...)
  socket.emit(...)
});

ser.on('test', function(socket, msg) {
  console.log('test', msg);
});

// 非 websocket 客户端请求的应答
ser.request = function(req, resp) {...}

// 启用 http 监听, 并代理到客户端
ser.begin_http_server();

// 用编程的方式请求代理
http.createServer(function (req, res) {
  ser.direct_proxy(req, res);
});

```


## HTTP 逆向代理

> 客户端注册到服务器后, 服务器接收浏览器的 http 请求并转发给客户端,
> 客户端再把请求转发给目的 http 服务器, http 的应答按这一流程返回到浏览器,
> 当前只支持 http


### Server

```js
// 基础配置与 createWSServer 相同
// http 监听端口与 http_port 相同
var option = {
    // 客户端连接到服务端提供一个认证密码
    proxy_pw   : '3n65432.fxnvfjew',
}

var ser = sio.proxyServer(option);

// 在端口上启动 http 服务器
ser.begin_http_server();
```

server 会导出固定服务:
* /wsproxy/html 向浏览器发送一个页面, 含有可以代理的目标网络列表
* /wsproxy/json 向浏览器发送含有目标网络列表的 json 数据


### Client

```js
var option = {
    // 中心代理服务器的地址
    server_url   : 'http://192.168.7.144:80',
    // 客户端连接到服务端提供一个认证密码
    proxy_pw     : '3n65432.fxnvfjew',

    // 最终的 http 请求发送的目标地址, 可以是准确路径的用于跳转
    proxy_target : 'http://host:port[/path/page]',

    // [ cookie 策略, 优先级 1 ]
    // 浏览器请求这个路径后, 被跳转到被代理路径
    // 这种方法依赖 cookie, 这个参数不能为空
    proxy_path  : '/a/b/c',
    // 代理目标的名称, 用于识别
    proxy_name  : ''

    // [ URL 前缀 , 优先级 2 ]
    // 如果用户请求这个 url 为前缀的地址则直接访问目标地址
    // 在 cookie 不可用的时候, 使用这个方法, 多个客户端不可以相同
    // 这个地址必须是目标地址中有效的前缀
    prefix_url  : '/path',

    // [ 二级域名策略 , 优先级 3 ]
    // 必须是一个有效路径, 当用户请求 http://host/path/somename/otherpath 时
    // 会请求目标地址的 http://somename.host/otherpath, `path` 即 a2domain 的配置
    // 多个客户端的 otherpath 不能重复
    a2domain  : '/path',
};

// server_host -- websocket 服务器的地址
var cli = sio.proxyClient([server_host, ] option);
```
