$(document).ready(function() {
	var Debug = {

		log: function (msg) {
			console.log(new Date().toJSON() +": "+ msg);
		},

		toggle: function(speed) {
			speed = speed || 'fast';
			defaultDebug.slideToggle(speed);
		}
	};

	function init() {
		Debug.log("Connecting...");

		search.focus(function() {
			isSearching = true;
		});

		search.blur(function() {
			isSearching = false;
		});

		$(document).keyup(function(e) {

			if (!isSearching) {
				switch (e.keyCode) {
					case 49: // 1
							preferredSize = 3;
						break;
					case 50: // 2
							preferredSize = 2;
						break;
					case 51: // 3
							preferredSize = 1;
						break;
					case 52: // 4
							preferredSize = 0;
						break;
					case 32: // space
							tweets.html('');
						break;
					case 220: // backslash
							Debug.toggle();
						break;
				}
			} else { // input field has the focus
				switch (e.keyCode) {
					case 13: // enter
							socket.emit('search', { search: search.val() });
							search.val('');
						break;
				}
			}

		});

		tweets.imagesLoaded(function() {
			tweets.masonry({
				itemSelector : '.box'
			});
		});
	}

	function calcMaxPerSecond() {
		maxPerSecondInterval = setInterval(function() {
			speed.html(tweetsAmount);

			if (maxTweetsAmount < tweetsAmount) {
				maxTweetsAmount = tweetsAmount;
			}

			maxSpeed.html(maxTweetsAmount);

			tweetsAmount = 0;
		}, 1000);
	}

	/*
	* Main
	*/

	var socket = new io.connect(window.location.href);
	
	var tweets = $("#tweets"),
		defaultDebug = $("#stats"),
		search = $("#search"),
		speed = $("#speed"),
		maxSpeed = $("#maxSpeed"),
		maxPerSecondInterval = null,
		tweetsAmount = 0,
		maxTweetsAmount = 0,
		isSearching = false,
		sizes = [{
              "size": "large",
              "w": 700,
              "h": 466
            }, {
              "size": "medium",
              "w": 600,
              "h": 399
            }, {
              "size": "small",
              "w": 340,
              "h": 226
            }, {
              "size": "thumb",
              "w": 150,
              "h": 150
            }
          ];
		preferredSize = 3;
	
	init();
	calcMaxPerSecond();

	/* 
	* Socket stuff	
	*/
	    
    socket.on('connect', function() {
		Debug.log("Connected.");
	});
			
	socket.on('disconnect', function() {
		Debug.log("Disconnected.");
		clearInterval(maxPerSecondInterval);
	});
		
	socket.on('tot', function(data) {	
		Debug.log("Current viewers: "+ data.tot);
	});

	socket.on('filters', function(data) {	
		Debug.log("Param: "+ data.param +", value: "+ data.value);
	});

	function strdecode(data) {
		return JSON.parse(decodeURIComponent(escape(data)));
	}

	// https://dev.twitter.com/docs/tweet-entities
	socket.on('tweet', function(tweet) {	
		tweet = strdecode(tweet);

		if ((tweet.entities) && (tweet.entities.media)) {
			tweet.entities.media.forEach(function(image) {
				var finalImage = $("<img />").attr({
	            	src: image.media_url +':'+ sizes[preferredSize].size,
	            	alt: tweet.text,
	            	onload: function () {
	            				var anchor = $("<a />", {
	            						href: image.media_url,
	            						title: tweet.user.screen_name +': '+ tweet.text ,
	            						target: '_blank'
	            					});

	            				anchor.append($(this));

	            				var span = $("<span />", {
	            					class: "box",
	            					width: sizes[preferredSize].w,
	            					html: anchor
	            				});

	            				tweets.prepend(span).masonry('reload');
	            			}
	       		});
			});

			// Debug.log(tweet.entities.media.length +" images found");
		} else {
			// Debug.log("No image");
		}

		tweetsAmount++;
	});
});