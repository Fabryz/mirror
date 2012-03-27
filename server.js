/*
* Express
*/

var express = require('express'),
	app = module.exports = express.createServer();

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	app.use(express.logger(':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'));
	app.use(express.favicon());
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Routes

app.get('/',  function(req, res) {
	res.sendfile('index.html');
});

app.listen(8080);
console.log("* Express server listening in %s mode", app.settings.env);

/*
* Socket.IO
*/

var	io = require('socket.io').listen(app),
	Player = require('./public/js/Player.js').Player,
	players = [],
 	totPlayers = 0,
	pings = [],
	pingInterval = null,
	pingEvery = 5000;
	
io.configure(function() { 
	io.enable('browser client minification');
	io.set('log level', 1); 
}); 

function getPlayerById(id) {
	var length = players.length;
	for(var i = 0; i < length; i++) {
		if (players[i].id == id) {
			return players[i];
		}
	}
}

function newPlayer(client) {
	p = new Player(client.id);
	players.push(p);

	client.emit('join', { player: p });
	client.broadcast.emit('newplayer', { player: p });

	console.log('+ New player: '+ p.nick);
}

function sendPlayerList(client) {
	client.emit('playerlist', { list: players }); //FIXME improve me
	console.log('* Sent player list to '+ client.id);
}

// ping is intended as server -> client -> server time
function pingClients() {
	var length = players.length;
	for(var i = 0; i < length; i++) {
		if (players[i].id) {
			pings[players[i].id] = { time: Date.now(), ping: 0 };
			//console.log('Ping? '+ players[i].id); //log filler
			io.sockets.sockets[players[i].id].emit('ping');
		}
	}
}

io.sockets.on('connection', function(client) {
	newPlayer(client);
	sendPlayerList(client);

	totPlayers++;
	console.log('+ Player '+ client.id +' connected, total players: '+ totPlayers);

	client.emit("clientId", { id: client.id });
	io.sockets.emit("tot", { tot: totPlayers });

	if ((totPlayers == 1) && (pingInterval === null)) {
		pingInterval = setInterval(pingClients, pingEvery);
	}

	client.on("screen", function(data) {
		io.sockets.emit("screen", { id: data.id, screen: data.screen });
	});

	client.on('pong', function(data) {
		pings[client.id] = { ping: (Date.now() - pings[client.id].time) };

		var length = players.length;
		for(var i = 0; i < length; i++) {
			if (players[i].id == client.id) {
				players[i].ping = pings[client.id].ping;
				break;
			}
		}

		//console.log('Pong! '+ client.id +' '+ pings[client.id].ping +'ms'); //log filler

		//broadcast confirmed player ping
		io.emit('pingupdate', { id: client.id, ping: pings[client.id].ping });
	});

	client.on('disconnect', function() {
		var quitter = '';

		var length = players.length;
		for(var i = 0; i < length; i++) {
			if (players[i].id == client.id) {
				quitter = players[i].nick;
				players.splice(i, 1);
				break;
			}
		}

		totPlayers--;
		client.broadcast.emit('quit', { id: client.id });
		io.sockets.emit('tot', { tot: totPlayers });
		console.log('- Player '+ quitter +' ('+ client.id +') disconnected, total players: '+ totPlayers);

		if (totPlayers == 0) {
			clearTimeout(pingInterval);
			pingInterval = null;
		}
	});
});