var cookie = require('cookie');
var ulib   = require('url');

//
// 每个策略对象都要处理所有的客户端请求
// 这个列表是有顺序的
//
// onconn(client,msg, pconf)  新的客户端请求时被调用
// onreq(req, resp, next)     浏览器发来的请求转交给客户端
// ondisconn(msg)             客户端断开了连接, 释放资源
//
module.exports = {
  cookie_ploy     : cookie_ploy,
  prefix_url_ploy : prefix_url_ploy,
  a2domain_ploy   : a2domain_ploy,
  proxy_list_ploy : proxy_list_ploy,
};


function a2domain_ploy(invoke_proxy) {

  // prefix : client_ws_socket
  var a2domain = {};

  function onreq(req, resp, next) {
    // console.log('a2domain_ploy');
    var sp = req.url.split('/');
    var cli = a2domain[ sp[1] ];
    if (cli) {
      var a2 = sp[2];
      sp.splice(1, 2);
      req.url = sp.join('/');
      req.re_writing_host = req.headers.host = a2 + '.' + cli.host;
      invoke_proxy(req, resp, cli.client, next);
      return;
    }
    next();
  }

  function onconn(client, msg, pconf) {
    // 二级域名策略
    if (msg.a2domain) {
      var a2d = msg.a2domain;

      if (a2d[0] == '/') a2d = a2d.substr(1);
      if (a2domain[a2d]) {
        rcb(new Error('a2domain url conflict:' + a2d));
        return;
      }

      a2domain[a2d] = { client: client, 
        host: ulib.parse(msg.proxy_target).host };
    }
  }

  function ondisconn(msg) {
    delete a2domain[msg.a2domain];
  }

  return {
    onreq     : onreq,
    onconn    : onconn,
    ondisconn : ondisconn,
  };
}


function cookie_ploy(invoke_proxy) {
  var UID_NAME = '__WS_PROXY_UID_KEY__';
  // url : {uid, jpath, name}
  var url_cnf = {};
  var uid_cli = {};

  function check_cookie(req, resp, next) {
    if (req.headers.cookie) {
      var ck = cookie.parse(req.headers.cookie);
      if (ck[UID_NAME]) {
        var client = uid_cli[ ck[UID_NAME] ];
        if (client) {
          invoke_proxy(req, resp, client, next);
          return;
        }
      }
    }
    next();
  }

  function jump_proxy(req, resp, next) {
    var cli = url_cnf[req.url];
    if (!cli) 
      return next();

    resp.statusCode = 302;
    resp.setHeader('Location', cli.jpath);  
    resp.setHeader("Pragma", "no-cache");
    resp.setHeader("Cache-Control", "no-cache");
    resp.setHeader("Set-Cookie", UID_NAME + '=' + cli.uid + '; Path=/; HttpOnly');
    resp.end(/* '<script>location.href="' + cli.jpath + '";</script>' */);
  }

  function onreq(req, resp, next) {
    // console.log('cookie_ploy');
    jump_proxy(req, resp, function() {
      check_cookie(req, resp, next);
    });
  }

  function onconn(client, msg, pconf) {
    var path = pconf.propath;
    // 最后有一个 `/` 的路径
    var path2;

    if (path[ path.length-1 ] == '/') {
      path2 = path;
      path = path.substring(0, path.length-1);
    } else {
      path2 = path + '/';
    }

    if (url_cnf[path] || url_cnf[path2]) {
			console.warn('url conflict:' + msg.proxy_path));
      //rcb(new Error('url conflict:' + msg.proxy_path));
      //return;
    }

    pconf.path2 = path2;

    url_cnf[path] = url_cnf[path2] = pconf;
    uid_cli[pconf.uid] = client;
  }

  function ondisconn(msg, pconf) {
    delete url_cnf[pconf.propath];
    delete url_cnf[pconf.path2];
  }

  return {
    onreq     : onreq,
    onconn    : onconn,
    ondisconn : ondisconn,
  };
}


function prefix_url_ploy(invoke_proxy) {
  var fix_cli = {};

  function onreq(req, resp, next) {
    for (var n in fix_cli) {
      if (req.url.indexOf(n) === 0) {
        invoke_proxy(req, resp, fix_cli[n], next);
        return;
      }
    }
    next();
  }

  function onconn(client, msg, pconf) {
    if (msg.prefix_url) {
      if (fix_cli[msg.prefix_url]) {
        rcb(new Error('prefix url conflict:' + msg.prefix_url));
        return;
      }
      fix_cli[msg.prefix_url] = client;
    }
  }

  function ondisconn(msg, pconf) {
    delete fix_cli[msg.prefix_url];
  }

  return {
    onreq     : onreq,
    onconn    : onconn,
    ondisconn : ondisconn,
  };
}


function proxy_list_ploy(invoke_proxy) {
  var url_cnf = {};

  function proxy_list_mid(req, resp, next) {
    if (req.url == '/wsproxy/html') {
      write_proxy_list_html(req, resp);
    } else if (req.url == '/wsproxy/json') {
      write_proxy_list_json(req, resp);
    } else {
      next();
    }
  }

  function write_proxy_list_json(req, resp) {
    var json = { ret:0, data:{} };
    for (var p in url_cnf) {
      json.data[  url_cnf[p].name + '(' + p + ')' ] = url_cnf[p];
    }
    resp.end( JSON.stringify(json) ); 
  }

  function write_proxy_list_html(req, resp) {
    for (var p in url_cnf) {
      resp.write('<a href="' + url_cnf[p].propath + '">' 
        + url_cnf[p].name + ' - [' + p + ']' + '</a></br>');
    }
    resp.end();    
  }

  function onreq(req, resp, next) {
    proxy_list_mid(req, resp, function() {
      write_proxy_list_html(req, resp);
    });
  }

  function onconn(client, msg, pconf) {
    url_cnf[ msg.proxy_target ] = pconf
  }

  function ondisconn(msg, pconf) {
    delete url_cnf[ msg.proxy_target ];
  }

  return {
    onreq     : onreq,
    onconn    : onconn,
    ondisconn : ondisconn,
  };
}