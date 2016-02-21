var conf = {

  websocket_proxy : {
    // 参数优先级高于配置优先级
    server : {
      http_port    : 80,
      proxy_pw     : '3n65432.fxnvfjew',
    },

    client : {
      server_url   : 'http://192.168.7.144:80',
      proxy_pw     : '3n65432.fxnvfjew',
      // url 中含有一个默认的跳转地址
      proxy_target : 'http://192.168.7.144:8012/eeb/ui/index.htm',
      // 代理路径是准确匹配的
      proxy_path   : '/eeb1',
      proxy_name   : 'ETL/ESB system 1',
    }
  }

};


module.exports = conf;