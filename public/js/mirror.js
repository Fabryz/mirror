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

	function renderData(id, data) {
		var col = data.split(";"),
			img = image;

		for (var i = 0; i < canvasWidth; i++) {
			var tmp = parseInt(col[i]);
			img.data[pos + 0] = (tmp >> 16) & 0xff;
			img.data[pos + 1] = (tmp >> 8) & 0xff;
			img.data[pos + 2] = tmp & 0xff;
			img.data[pos + 3] = 0xff;
			pos+= 4;
		}

		if ( pos >= 4 * canvasWidth * canvasHeight) {
			if (id == player.id) {
				ctx.clearRect(0, 0, canvasWidth, canvasHeight);
				ctx.putImageData(img, 0, 0);
			} else {
				var tmp_ctx = $("#players ul").find("[data-id='" + id +"']").get(0).getContext("2d"); //FIXME
				tmp_ctx.clearRect(0, 0, canvasWidth, canvasHeight);
				tmp_ctx.putImageData(img, 0, 0);
			}
			pos = 0;
		}
	}

	function appendCanvas(id) {
		$("#players ul").append(
			$("<li>").append(
				$("<canvas/>", {
					"data-id": id,
					"width": canvasWidth,
					"height": canvasHeight
				})
			)
		);
	}

	function removeCanvas(id) {
		$("#players ul").find("[data-id='" + id +"']").parent().remove();
	}

	function appendPlayerList(id, nick) {

		var newLi = $("<li/>").append($("<a/>", {
			"class": "nick",
			"href": "#",
			"title": "Send a PM to: "+ nick,
			"data-id": id
		}).html(nick));

		playerlist.append(newLi);

		$(newLi).find("a").bind("click", function() {
			selected.empty();
			selected.html($(this).data("id")); // FIXME Something is wrong here.
			chatMsg.focus();
		});
	}

	function removePlayerList(id) {
		playerlist.find("[data-id='" + id +"']").parent().remove();
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
				socket.emit("screen", { id: player.id, screen: data });
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
		temp_img.src = "../img/HTML5_Logo_64.png";
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
			var screenshot = canvas.get(0).toDataURL("image/png");

			window.open(screenshot, "Screenshot", "width="+ canvasWidth +", height="+ canvasHeight);
		});

		$("#broadcast").click(function() {
			webcam.capture();
		});

		chatMsg.focus();

		chatMsg.keydown(function(e) {
			if (e.keyCode === 13) { // enter
				if (selected.text() == "broadcast") {
					socket.emit("chat", { msg: chatMsg.val() });
				} else {
					socket.emit("private", { msg: chatMsg.val(), to: selected.text() });
				}
				chatMsg.val('');
			}
		});

		talkto.bind("click", function() {
			selected.html('broadcast');
			chatMsg.focus();
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

	var chatLog = $("#chatLog ul"),
		playerlist = $("#playerlist ul"),
		chatMsg = $("#chatMsg"),
		selected = $("#selected"),
		talkto = $("#talkto");

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
		appendPlayerList(player.id, player.nick);

		log('You have joined the server.');
	});

	socket.on('quit', function(data) {
		var quitter = '';

		var length = players.length;
		for(var i = 0; i < length; i++) {
			if (players[i].id == data.id) {
				quitter = players[i].nick;
				removeCanvas(players[i].id);
				removePlayerList(players[i].id);
				if (selected.text() == players[i].id) {
					selected.html('broadcast');
				}
				players.splice(i, 1);
				break;
			}
		}

		log('Player quitted: '+ quitter +' (id '+ data.id +')');
	});

	socket.on('newplayer', function(data) {
		var newPlayer = new Player();
		newPlayer = jQuery.extend(true, {}, data.player);
		players.push(newPlayer);
		log('New player joined: '+ newPlayer.nick +' ('+ players.length +' total)');

		appendPlayerList(newPlayer.id, newPlayer.nick);
		appendCanvas(newPlayer.id);
		
		newPlayer = {};
	});

	socket.on('playerlist', function(data) {
		players = []; //prepare for new list

		var length = data.list.length;
		for(var i = 0; i < length; i++) {
			var tmpPlayer = new Player();

			tmpPlayer = jQuery.extend(true, {}, data.list[i]);
			players.push(tmpPlayer);

			if (tmpPlayer.id != player.id) {
				appendPlayerList(tmpPlayer.id, tmpPlayer.nick);
				appendCanvas(tmpPlayer.id);
			}

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

		renderData(data.id, data.screen);
	});

	socket.on("chat", function(data) {
		chatLog.append('<li><strong>'+ data.from +'</strong>: '+ data.msg +'</li>');
	});

	socket.on("private", function(data) {
		chatLog.append('<li class="private"><strong>'+ data.from +' -> '+ data.to +'</strong>: '+ data.msg +'</li>');
	});
});