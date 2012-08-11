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
			var tmp = parseInt(col[i], 10);
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
				$("<img/>", {
					"src": "",
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
			selected.html($(this).attr("data-id"));
			chatMsg.focus();
		});
	}

	function removePlayerList(id) {
		playerlist.find("[data-id='" + id +"']").parent().remove();
	}

	function init() {
		log(canvasWidth +"x"+ canvasHeight +" Canvas ready.");

		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.font = "15px Monospace";
			
		status.html("Connecting...");
		log("Connecting...");

		//socket.emit("screen", { id: player.id, screen: data });

		//webcam_handle.attr({ width: canvasWidth, height: canvasHeight });

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		var temp_img = new Image();
		temp_img.src = "../img/HTML5_Logo_64.png";
		temp_img.onload = function() {
			ctx.drawImage(temp_img, canvasWidth / 2 - temp_img.width / 2, canvasHeight / 2 - temp_img.height / 2);
		};
		image = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

		$(document).keyup(function(e) {
			if (e.keyCode === 220) { //backslash
				toggleDebug();
			}
		});

		$("#save").on("click", function() {
			var screenshot = canvas.get(0).toDataURL("image/png");

			window.open(screenshot, "Screenshot", "width="+ canvasWidth +", height="+ canvasHeight);
		});

		$("#start").on("click", function() {
			start();
		});
		$("#stop").on("click", function() {
			stop();
		});
		$("#drawFrame").on("click", function() {
			drawFrame();
		});

		$("#sourcevid").on("loadedmetadata", function() {
			ResizeCanvas();
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

		$("#save").on("click", function() {
            var screenshot = canvas.toDataURL("image/png");
            window.open(screenshot, "Screenshot", "width="+ 480 +", height="+ 360);
        });

		$("#flip").on("change", function() {
			flipX = !flipX;
		});

		$("#thres").on("change", function() {
			threshold = this.value;
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

	var webcam_handle = $("#tmpImage"),
		pos = 0,
		image = null;

	var player = new Player(),
		players = [];

	var chatLog = $("#chatLog ul"),
		playerlist = $("#playerlist ul"),
		chatMsg = $("#chatMsg"),
		selected = $("#selected"),
		talkto = $("#talkto");


	var scanvas = document.getElementById("tmpImage");
	var sctx =  scanvas.getContext('2d');

    var localMediaStream = null;
    var video = document.querySelector('video');

	var prev_frame = null;
	var threshold = 25;
	var flipX = false;

	function toGrey(frame) {
        grayFrame = new Array (frame.data.length / 4);
        for (i = 0; i < grayFrame.length; i++) {
          r = frame.data[4*i+0];
          g = frame.data[4*i+1];
          b = frame.data[4*i+2];
          grayFrame[i] = Math.min(0.3*r + 0.59*g + 0.11*b, 255);
        }
        return grayFrame;
      }

    function drawFrame() {
        w = 480; h = 360;
        

          if (flipX) {
            sctx.save();
            sctx.scale(-1, 1);
            sctx.drawImage(video, -w, 0, w, h);
            sctx.restore();
          } else {
              sctx.drawImage(video, 0, 0, w, h);
          }

          
        frame = sctx.getImageData(0, 0, w, h);
          
        // convert current frame to gray
        cur_frame = toGrey(frame);

        // avoid calling this the first time
		if (prev_frame !== null) {
          // calculate difference
          for (i = 0; i < cur_frame.length; i++) {
            if (Math.abs(prev_frame[i] - cur_frame[i]) > threshold) {
              // color in pixels with high difference
              frame.data[4*i+0] = 255;
              frame.data[4*i+1] = 100;
              frame.data[4*i+2] = 0;
              frame.data[4*i+3] = 255;
            } /* else {
              frame.data[4*i+0] = 0;
              frame.data[4*i+1] = 0;
              frame.data[4*i+2] = 0;
              frame.data[4*i+3] = 0;
            } */
          }
          //console.log(JSON.stringify(frame).length);
        }

        // remember current frame as previous one
        prev_frame = cur_frame;
          
        sctx.putImageData(frame, 0, 0);
              
        if (video.paused || video.ended) {
          return;
        }

        var screen = $("#tmpImage").get(0).toDataURL();

        socket.emit("screen", { id: player.id, screen: screen });

        setTimeout(function () {
          drawFrame();
        }, 500);
      }


 function snapshot() {
        if (localMediaStream) {
            ctx.drawImage(video, 0, 0);
            var img = document.getElementById('CaptureImage');
            // "image/webp" works in Chrome 18. In other browsers, this will fall back to image/png.
            img.src = canvas.toDataURL('image/webp');
        }
    }

    function hasGetUserMedia() {
        // Note: Opera builds are unprefixed.
        return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia);
    }

    function onFailSoHard(e){
		console.log(e);
    }
    
    function start() {
        if (hasGetUserMedia()) {
            if (navigator.webkitGetUserMedia)
                navigator.getUserMedia = navigator.webkitGetUserMedia;
            //var getUserMedia = navigator.webkitGetUserMedia || navigator.getUserMedia;

            
            //var gumOptions = { video: true, toString: function () { return 'video'; } };
            if (navigator.getUserMedia) {
                navigator.getUserMedia({ video: true, audio: true }, function (stream) {
                    if (navigator.webkitGetUserMedia) {
                        video.src = window.webkitURL.createObjectURL(stream);
                    } else {
                        video.src = stream; // Opera
                    }
                    localMediaStream = stream;
                }, onFailSoHard);
            } else {
                video.src = 'somevideo.webm'; // fallback.
            }
        } else {
            alert("Your browser does not support getusermedia");
        }
    }

    function stop() {
        video = document.getElementById('sourcevid');
        video.src = "";
    }

    function ResizeCanvas() {
        scanvas.height = video.videoHeight;
        scanvas.width = video.videoWidth;
    }


	init();
	
	/*
	* Socket.io
	*/

    socket.on('connect', function() {
		status.html("Connected.");
		log("Connected.");
	});
			
	socket.on('disconnect', function() {
		chatLog.append('<li><strong>* * * Disconnected.</strong></li>');
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

		//renderData(data.id, data.screen);

		$("#arrived").attr("src", data.screen);

		console.log("arrived "+ Date.now() );
	});

	socket.on("chat", function(data) {
		chatLog.append('<li><strong>'+ data.from +'</strong>: '+ data.msg +'</li>');
	});

	socket.on("private", function(data) {
		chatLog.append('<li class="private"><strong>'+ data.from +' -> '+ data.to +'</strong>: '+ data.msg +'</li>');
	});
});