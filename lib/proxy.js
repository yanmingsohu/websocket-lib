var sio    = require('./base.js');
var ploy   = require('./proxy-ploy.js');
var clib   = require('configuration-lib');
var uuid   = require('uuid-zy-lib');
var ulib   = require('url');
var http   = require('http');
var logger = require('logger-lib')('ws-proxy');


var conf  = clib.load().websocket_proxy || {server:{}, client:{}};
// 每个客户端连接都会占用 10 个左右的监听器
var MAX_LISTENERS = 1200;


module.exports = {
  proxyServer : proxyServer,
  proxyClient : proxyClient,
};


//
// option -- 为空则从配置文件中读取
//
function proxyServer(option) {
  var opt   = clib.extends(conf.server, option);
  var ser   = sio.createWSServer(opt);
  var ploys = [];
  var request_plot = null;


  for (var p in ploy) {
    (function() {

      var name = p;
      var ploy_ins = ploy[name](invoke_proxy);
      ploys.push(ploy_ins);

      if (!request_plot) {
        request_plot = function(req, resp, next) {
          ploy_ins.onreq(req, resp, next);
        };

      } else {
        var pre = request_plot;

        request_plot = function(req, resp, next) {
          pre(req, resp, function() {
            ploy_ins.onreq(req, resp, next);
          })
        };
      }

      // console.log('Proxy ploy:', name);
    })();
  }

  //
  // 客户端向服务器注册目的地址
  //
  ser.on('reg_client', function(socket, msg) {
    save_client(socket, msg, function(err) {
      if (err) {
        socket.emit('reg_result', { err: err.message });
        socket.disconnect();
      } else {
        socket.emit('reg_result', { msg: 'success' });
      }
    });
  });

  ser.begin_http_server = begin_http_server;
  ser.direct_proxy = direct_proxy;


  function begin_http_server() {
    //
    // 监听浏览器请求, 并作代理
    //
    ser.request = function(req, resp) {
      request_plot(req, resp, r404);
    };
  }

  //
  // 服务器端通过编程的方式直接发送请求并代理到客户端
  //
  function direct_proxy(req, resp) {
    request_plot(req, resp, r404);
  }


  function r404(req, resp, next) {
    resp.statusCode = 404;
    resp.end();
  }


  function invoke_proxy(req, resp, client, next) {
    var num   = 0;
    var names = [];
    var uid   = uuid.v4();
    var path  = req.url;
    var code  = -1;    
    var stime = process.hrtime();

    // console.log('+RH', uid, path, client.id)

    client.emit('request_header', {
      headers       : req.headers,
      method        : req.method,
      url           : path,
      host          : req.re_writing_host,
      statusCode    : req.statusCode,
      statusMessage : req.statusMessage,
      uid           : uid,
    });

    req.on('data', function(data) {
      // console.log('++', data.toString('utf8'))
      client.emit(_E('request_data'), {
        num  : num++,
        data : data,
      });
    });

    req.on('end', function() {
      client.emit(_E('request_end'), {
        pcount : num
      });
    });

    client.on(_E('response_header'), function(ret) {
      code = ret.statusCode;
      resp.writeHead(ret.statusCode, ret.statusMessage, ret.headers);
    });

    client.on(_E('response_data'), function(ret) {
      resp.write(ret.data);
    });

    client.on(_E('response_end'), function(ret) {
      resp.end();
      _print_time();
      _free();
    });

    client.on('disconnect', _free);

    client.on(_E('error'), function(msg) {
      resp.statusCode = 502;
      resp.end(msg);
      _print_time(msg);
      _free();
    });

    function _free() {
      names.forEach(function(n) {
        client.removeAllListeners(n);
      });
      client.removeListener('disconnect', _free);
      req = resp = client = path = null;
    }

    function _E(eventname) {
      eventname = eventname + uid;
      names.push(eventname);
      return eventname;
    }

    function _print_time(err_str) {
      var diff = process.hrtime(stime);
      logger.debug('Proxy', path, 
        err_str ? 'has error ' + err_str
                : 'use ' + (diff[0] * 1e3 + diff[1] / 1e6) + 'ms');
    }
  }

  function save_client(client, msg, rcb) {
    // 没有最后 `/` 的路径
    var path = msg.proxy_path;

    client.join(path);

    if (path[0] != '/') {
      path = '/' + path;
    }

    var _jpath = ulib.parse(msg.proxy_target).pathname;
    var _uid   = uuid.v4();

    // onconn() 如果修改了 pconf, ondisconn 可以读取这些修改
    var pconf  = { uid: _uid, jpath: _jpath, name: msg.proxy_name, propath: path };

    for (var i=0, e=ploys.length; i<e; ++i) {
      ploys[i].onconn(client, msg, pconf);
    }

    // client.setMaxListeners(MAX_LISTENERS);
    client.once('disconnect', function() {
      for (var i=0, e=ploys.length; i<e; ++i) {
        ploys[i].ondisconn(msg, pconf);
      }
    });

    rcb(null);
  }

  return ser;
}  


//
// host   -- ws 服务器地址
// option -- 为空则从配置文件中读取
//
function proxyClient(host, option) {
  if (typeof host === 'object') {
    option = host;
    host = null;
  }

  var opt = clib.extends(conf.client, option);
  var socket = sio.createWSClient(host || opt.server_url, opt);


  socket.on('connect', function() {
    var cpy = clib.extends(opt);
    delete cpy.proxy_pw;
    socket.emit('reg_client', cpy);
  });

  socket.on('reg_result', function(ret) {
    if (ret.err) {
      socket.emit('error', ret.err);
      socket.disconnect();
    }
  });

  socket.on('request_header', function(ret) {
    var num   = 0;
    var names = [];
    var uid   = ret.uid;

    var options = ulib.parse(opt.proxy_target);
    options.path     = options.pathname = ret.url;
    options.method   = ret.method;
    options.headers  = ret.headers;

    // 通过 host 属性重写 url
    if (ret.host) {
      options.headers.host =
        options.hostname = options.host = ret.host;
    } else {
      options.headers.host = options.host;
    }

    // console.log('RH', options, uid, ret.url)

    var req = http.request(options, function(resp) {
      socket.emit(_E('response_header'), {
        headers       : resp.headers,
        statusCode    : resp.statusCode,
        statusMessage : resp.statusMessage,
      });

      resp.on('data', function(data) {
        socket.emit(_E('response_data'), {
          num  : num++,
          data : data,
        });
      });

      resp.on('end', function() {
        socket.emit(_E('response_end'), {
          pcount : num
        });
        _free();
      });

      resp.on('error', function(err) {
        socket.emit(_E('error'), err.message);
        _free();
      });
    });

    socket.on(_E('request_data'), function(ret) {
      req.write(ret.data);
    });

    socket.on(_E('request_end'), function(ret) {
      req.end();
    });

    req.on('error', function(err) {
      socket.emit(_E('error'), err.message);
      _free();
    });

    function _free() {
      names.forEach(function(n) {
        socket.removeAllListeners(n);
      });
    }

    function _E(eventname) {
      eventname = eventname + uid;
      names.push(eventname);
      return eventname;
    }
  });

  return socket;
}