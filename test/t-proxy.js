var lib = require('../index.js');


lib.proxyServer({ http_port: 88 }).begin_http_server();

lib.proxyClient();


lib.proxyClient({
      server_url   : 'http://192.168.7.144:88',
      proxy_pw     : '3n65432.fxnvfjew',
      proxy_target : 'http://zr-i.com:8088/ui/login.html',
      proxy_path   : '/zr',
      proxy_name   : 'ZhiRong plant web.',
      prefix_url   : '/ui/',
    });


lib.proxyClient({
      server_url   : 'http://192.168.7.144:88',
      proxy_pw     : '3n65432.fxnvfjew-badpassword',
      proxy_target : 'http://qq.com',
      proxy_path   : '/qqq',
      proxy_name   : 'QQ',
      a2domain     : '/qq',
    });
