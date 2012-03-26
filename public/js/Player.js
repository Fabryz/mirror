(function(exports) {

	var Player = function(id) {
		this.id = id || -1;
		this.nick = 'Guest'+ this.id;

		this.lastMoveTime = Date.now();
		this.ping = 0;

		this.color = "#FF0000";
	};

	Player.prototype.toString = function() { 
		return '('+ this.id +') '+ this.nick;
	};

	exports.Player = Player;
})(typeof global === "undefined" ? window : exports);