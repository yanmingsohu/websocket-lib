var lib = require('../index.js');

var a = lib.secret('123');

var c0 = '_jengheiwa320532YTRE%$%*jfs_';
var c1 = a.code('DsHjgSdSK46A/n7UhhqbVGXUG2GjkwHy1kF/P7iadzk=');
var c2 = a.decode(c1);

console.log('ok', c2)