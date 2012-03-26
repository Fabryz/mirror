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
				log("Screen sent.");
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

			log("clicked capture");
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
	});
	
	socket.on('tot', function(data) {	
		tot.html(data.tot);
	});

	socket.on('screen', function(data) {	
		log("Screen received");

		renderData(data.screen);

	});
});