var url = require('url')
  , http = require('http')
  , argv = require('optimist').argv;

/*
 * listens for events from the agent
 * and then adds it to redis
 * returns the agent the buffer count in order to calibrate it
 */

var port = argv.p || process.env.PORT || 3000;
var message = process.env.SERVER_MSG || 'Server running at http://127.0.0.1:';
var echoMsg = process.env.SERVER_ECHO_MSG || '';
var server = http.createServer();

server.on('request', function(request, response) {
  request.on('end', function() {
    console.log(echoMsg + request.url);
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end();
  });

});

server.listen(port);
console.log(message + port);
