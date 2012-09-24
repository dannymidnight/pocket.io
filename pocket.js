//
// Main app for firing up upd & socket servers
//

var config = require('./config'),
    udp = require('./lib/udp_server'),
    ws = require('./lib/ws_server'),

    // Redis
    redis = require('./lib/redis').create(config.redis),
    redisPub = require('./lib/redis').create(config.redis),
    redisSub = require('./lib/redis').create(config.redis),

    // Clustering
    cluster = require('cluster'),
    numCPUs = require('os').cpus().length;


if (cluster.isMaster) {

  // Only spin up one udp
  udp.listen(config.udp_port);

  redis.flushall(function(didSucceed) {
    if (didSucceed) {
      console.log('Successfully flushed redis');
    } else {
      console.log('Failed to flush redis');
    }
  });

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });

} else {

  ws = ws({
    session_host: config.contests_http_host,
    web_port: config.web_port,
    redisClient: redis,
    redisPub:	redisPub,
    redisSub: redisSub
  });

  ws.configure('production', function(){
    ws.set('log level', 1);
    ws.set('transports', ['websocket']);
  });

  ws.configure('development', function(){
    ws.set('transports', ['websocket']);
  });

  udp.on("notification", function(data) {
    ws.push('notification', data.userid, data.data);
  });
}
