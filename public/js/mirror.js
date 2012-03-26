$(document).ready(function() {

	/*
	* Functions
	*/

	function log(msg) {
		console.log(new Date().getTime() +": "+ msg);
	}

	function toggleDebug(spd) {
		var speed = spd || 'fast';
	
		debug.fadeToggle(speed);
		debug.toggleClass("active");
		if (debug.hasClass("active")) {

		} else {

		}
	}

	function renderData(data) {
		var col = data.split(";");
		var img = image;

		for (var i = 0; i < canvasWidth; i++) {
			var tmp = parseInt(col[i]);
			img.data[pos + 0] = (tmp >> 16) & 0xff;
			img.data[pos + 1] = (tmp >> 8) & 0xff;
			img.data[pos + 2] = tmp & 0xff;
			img.data[pos + 3] = 0xff;
			pos+= 4;
		}

		if (pos >= 4 * canvasWidth * canvasHeight) {
			ctx.putImageData(img, 0, 0);
			pos = 0;
		}
	}

	function init() {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.font = "15px Monospace";
			
		status.html("Connecting...");
		log("Connecting...");

		//ctx.fillText("Canvas ready.", 10, 20);

		webcam_handle.webcam({
			width: canvasWidth,
			height: canvasHeight,
			mode: "stream",
			swffile: "js/jQuery-webcam/jscam_canvas_only.swf",
			onTick: function() {

			},
			onSave: function(data) {

				socket.emit("screen", { screen: data });
				//log("Screen sent.");
			},
			onCapture: function() {
				webcam.save();
			},
			debug: function(type, string) {
				 log(type +": "+ string);
			},
			onLoad: function() {
				var cams = webcam.getCameraList();
				for (var i in cams) {
					log("Found camera: " + cams[i]);
				}
				//webcam.capture()
			}
		});

		//webcam_handle.attr({ width: canvasWidth, height: canvasHeight });

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		var temp_img = new Image();
		temp_img.src = "http://www.w3.org/html/logo/downloads/HTML5_Logo_64.png";
		temp_img.onload = function() {
			ctx.drawImage(temp_img, canvasWidth / 2 - temp_img.width / 2, canvasHeight / 2 - temp_img.height / 2);
		}
		image = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

		$(document).keyup(function(e) {
			if (e.keyCode === 220) { //backslash
				toggleDebug();
			}
		});

		$("#save").click(function() {
			var screen = canvas.get(0).toDataURL("image/png");
			window.location = screen;
		});

		$("#capture").click(function() {
			webcam.capture();
		});
	}

	/*
	* Main
	*/

	var socket = new io.connect(window.location.href);
	
	var status = $("#status"),
		clientId = $("#clientId"),
		online = $("#online"),
		tot = $("#tot"),
		debug = $("#debug");

	var canvas = $("#canvas"),
		ctx = canvas.get(0).getContext("2d"),
		canvasWidth = canvas.width(),
		canvasHeight = canvas.height();

	var webcam_handle = $("#webcam"),
		pos = 0,
		image = null;

	var player = new Player(),
		players = [];

	log(canvasWidth +"x"+ canvasHeight +" Canvas ready.");
	init();
	
	/* 
	* Socket.io
	*/
	    
    socket.on('connect', function() {
    	status.html("Connected.");
    	log("Connected.");
	});
			
	socket.on('disconnect', function() {
		status.html("Disconnected.");
		log("Disconnected.");
	});
	
	socket.on('clientId', function(data) {
    	clientId.html(data.id);
    	log('Received current player id: '+ data.id);
	});
	
	socket.on('tot', function(data) {	
		tot.html(data.tot);
	});

	socket.on('join', function(data) {
		player = jQuery.extend(true, {}, data.player);
		// player.id = data.player.id;
		// player.nick = data.player.nick;
		// player.lastMoveTime = data.player.lastMoveTime;
		// player.ping = data.player.ping;
		// player.color = data.player.color;

		log('You have joined the server.');
	});

	socket.on('quit', function(data) {
		var quitter = '';

		var length = players.length;
		for(var i = 0; i < length; i++) {
			if (players[i].id == data.id) {
				quitter = players[i].nick;
				players.splice(i, 1);
				break;
			}
		}

		log('Player quitted: '+ quitter +' (id '+ data.id +')');
	});

	socket.on('newplayer', function(data) {
		var newPlayer = new Player();
		newPlayer = jQuery.extend(true, {}, data.player);

		// newPlayer.id = data.player.id;
		// newPlayer.nick = data.player.nick;
		// newPlayer.lastMoveTime = data.player.lastMoveTime;
		// newPlayer.ping = data.player.ping;
		// newPlayer.color = data.player.color;

		players.push(newPlayer);
		log('New player joined: '+ newPlayer.nick +' ('+ players.length +' total)');
		newPlayer = {};
	});

	socket.on('playerlist', function(data) {
		players = []; //prepare for new list

		var length = data.list.length;
		for(var i = 0; i < length; i++) {
			var tmpPlayer = new Player();

			tmpPlayer = jQuery.extend(true, {}, data.list[i]);

			// tmpPlayer.id = data.list[i].id;
			// tmpPlayer.nick = data.list[i].nick;
			// tmpPlayer.lastMoveTime = data.list[i].lastMoveTime;
			// tmpPlayer.ping = data.list[i].ping;
			// tmpPlayer.color = data.list[i].color;

			players.push(tmpPlayer);
			tmpPlayer = {};
		}

		log('Initial player list received: '+ length +' players.');
	});

	socket.on('ping', function(data) {
		socket.emit('pong', { time: Date.now() });
		//log('Ping? Pong!');
	});

	socket.on('pingupdate', function(data) {
		var length = players.length;
		for(var i = 0; i < length; i++) {
			if (players[i].id == data.id) {
				players[i].ping = data.ping;
				if (player.id == data.id) {
					player.ping = data.ping;
					//$("#ping").html(player.ping +'ms');
				}
				break;
			}
		}
	});

	socket.on('screen', function(data) {	
		//log("Screen received");

		renderData(data.screen);
	});
});