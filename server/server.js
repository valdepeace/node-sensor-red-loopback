var loopback = require('loopback');
var boot = require('loopback-boot');
//var RED = require('node-red');
var LoopBackContext = require('loopback-context');

var app = loopback();



boot(app, __dirname, function(err) {
    if (err) throw err;

});

module.exports = app;