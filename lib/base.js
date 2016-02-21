var https        = require('https');
var http         = require('http');
var socketio     = require('socket.io');
var EventEmitter = require('events').EventEmitter;
var scli         = require('socket.io-client');
var logger       = require('logger-lib')('ws');
var clib         = require('configuration-lib');


// 必须有这一行, 否则 socket.on('connect'... 无响应
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// 常量, 用于验证
var verify_key = '_web_socket_verify_93526_';
var verify_msg = '_jengheiwa320532YTRE%$%*jfs_';
var ALGORITHM  = 'aes192';


//
// 加密策略:
//  服务端使用密钥加密一个随机串给客户端, 客户端使用同一个密钥
//  加密这个串, 返回给服务端, 服务端验证串, 失败会断开连接
//
module.exports = {
  createWSServer : createWSServer,
  createWSClient : createWSClient,
  secret         : secret,
};


function createWSClient(url, opt) {
  opt = clib.extends({
    proxy_pw  : verify_msg,  // 认证密钥
    forceNew  : true,        // 总是创建一个新的客户端实例
  }, opt);

  var socket = scli(url, opt);
  var sec    = secret(opt.proxy_pw);
  var sid;


  socket.on('connect', function() {
    sid = socket.id;
    logger.log(sid, 'connect to server');
  });

  socket.on('error', function(e) {
    logger.error(sid, 'got some error', e);
  });

  socket.on('disconnect', function(){
    logger.log(sid, 'disconnect');
    sid = 'offline';
  });

  socket.on(verify_key, function(msg) {
    if (sec.decode(msg.c1) != msg.c0) {
      logger.log(sid, '到服务端的验证失败');
      socket.disconnect();
    } else {
      socket.emit(verify_key, sec.code(msg.c1));
    }
  });

  return socket;
}


//
// 加密算法, 加密/解密失败返回 ''
//
function secret(pass) {
  var crypto = require('crypto');

  var ret = {
    random : _random,
    code   : code,
    decode : decode,
    change : _change,
  };

  function _random() {
    return crypto.pseudoRandomBytes(32).toString('base64');
  }

  function _change(ps) {
    pass = ps;
  }

  function code(str) {
    var cip = crypto.createCipher(ALGORITHM, pass);
    var ret = [];
    try {
      ret [0] = cip.update(str, 'utf8', 'base64');
      ret [1] = cip.final('base64');
    } catch(e) {}
    return ret.join('~');
  }

  function decode(str) {
    var dec = crypto.createDecipher(ALGORITHM, pass);
    var ret = [];
    try {
      ret[0] = dec.update(str, 'base64', 'utf8');
      ret[1] = dec.final('utf8');
    } catch(e) {}
    return ret.join('');
  }

  return ret;
}


/**
 * 允许 resolve, reject 多次调用, 并绑定到多个 then
 *
 * @param p_handle(resolve, reject)
 * @returns {{then: _then}}
 * @constructor
 */
function PromiseRepeat(p_handle) {
  var then_cb = null;
  var save_count = [];

  if (p_handle)
  p_handle(_resolve);


  function _resolve(val) {
  save_count.push(val);
  if (then_cb) {
    call_then();
  }
  }

  function _then(cb) {
  then_cb = (cb);
  call_then();
  }

  function call_then() {
  var _count = save_count.length;
  for (var i=0; i<_count; ++i) {
    then_cb(save_count[i]);
  }
  }

  return {
  then: _then,
  resolve: _resolve
  };
}


function createWSServer(opt) {
  var ret = {};

  opt = clib.extends({
    // 非默认值, 仅作参考
    // http_port : 80,
    // https_port : 443,
    // https: {
    //   key  : '',
    //   cert : '',
    //   passphrase: ''
    // }
    proxy_pw : verify_msg
  }, opt);


  var on_handles = PromiseRepeat(function(save_handle) {
    if (opt.http_port > 0) {
      var server = http.createServer(serverHandle);
      _cw(opt.http_port, server, 'http');

    } else if (opt.https_port > 0) {
      var server = https.createServer(opt.https, serverHandle);
      _cw(opt.https_port, server, 'https');
      
    } else {
      throw new Error('must have `http_port` or `https_port`.');
    }
  
    ret.on = function() {
      save_handle(arguments);
    };
  });
    

  // 浏览器端调用返回的消息
  function serverHandle(req, res) {
    if (ret.request) {
      ret.request(req, res, f404);
    } else {
      f404();
    }

    function f404() {
      res.statusCode = 404;
      res.end('not found');
    }
  }


  function _cw(port, server, type) {
    server.listen(port, function() {
      logger.log('server listen ', port, type);
    });

    var io = socketio.listen(server);

    io.on('connection', function(socket) {
      var wait_success_fn = [];
      var sid = socket.id;
      logger.log(sid, 'client connection', port);
    
      socket.on('error', function(e) {
        logger.error(sid, 'Got some error:', e);
      });

      var sec       = secret(opt.proxy_pw);
      var randomkey = sec.random();
      var first_ps  = sec.code(randomkey);
      var second_ps = sec.code(first_ps);
      sec = null;

      socket.emit(verify_key, {
        c0 : randomkey,
        c1 : first_ps
      });
    
      socket.on(verify_key, function(msg) {
        if (msg != second_ps) {
          logger.log(sid, '到客户端的验证失败');
          socket.disconnect();
        } else {
          connect_success();
        }
      });

    
      on_handles.then(function(args) {
        var event_name = args[0], 
          event_handle = args[1];

        socket.on(event_name, function(_retdata) {
          var dofn = function() {
            event_handle.call(this, socket, _retdata);
          };
          if (wait_success_fn) {
            wait_success_fn.push(dofn);
          } else {
            dofn();
          }
        });
      }); 

      function connect_success() {
        wait_success_fn.forEach(function(fn) { fn(); });
        wait_success_fn = null;
      }
    });
  
    ret.io = io;
    ret.server = server;
  }


  return ret;
}