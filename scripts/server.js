var url = require('url')
  , http = require('http')
  , argv = require('optimist').argv;

/*
 * listens for events from the agent
 * and then adds it to redis
 * returns the agent the buffer count in order to calibrate it
 */

var port = argv.p || process.env.PORT || 3000;
var server = http.createServer();

server.on('request', function(request, response) {
  request.on('end', function() {
    console.log(url.parse(request.url));
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end();
  });

});

server.listen(port);
console.log('Server running at http://127.0.0.1:' + port);
