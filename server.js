var express = require('express'),
	fs = require('fs'),
	jQuery = require('jquery'),
	Tuiter = require('tuiter'),
	app = module.exports = express.createServer();

/*
* Configurations
*/

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'))
    app.use(express.logger(':remote-addr - :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'));
    app.use(express.favicon());
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
});

/*
* Express
*/

function secondsToString(seconds) {
	var numDays = Math.floor(seconds / 86400);
	var numHours = Math.floor((seconds % 86400) / 3600);
	var numMinutes = Math.floor(((seconds % 86400) % 3600) / 60);
	var numSeconds = Math.floor((seconds % 86400) % 3600) % 60;

	return numDays +" days "+ numHours +" hours "+ numMinutes +" minutes "+ numSeconds +" seconds.";
}

app.get('/', function(req, res) {
	res.sendfile('index.html');
});

app.get('/uptime', function(req, res) {
	res.end("The server has been up for: "+ secondsToString( process.uptime().toString() ) );
});

app.get('/restart', function(req, res) {
	console.log(" * Restarting in 5 seconds... * ");
	setTimeout(function() {
		if (stream != '') {
			stream = '';
			grabTwitterFeed();
			console.log(" * Triggered restart * ");
		}
		res.redirect('/');
	}, 5000);
});

/*
* Main
*/

var	totUsers = 0;

var stream = '',
	streamInterval = '',
	configs = '';

app.listen(8080);
console.log("* Express server listening in %s mode", app.settings.env);

configs = readConfigs();
console.log("* Param: "+ configs.param +", value: "+ configs.value);

streamInterval = setInterval(function() {
	if (stream != '') {
		stream = '';
		grabTwitterFeed();
		console.log(" * 5 mins passed, autorestarted. * ");
	}
}, 300000); // 5 mins

/*
* Functions
*/

// return require("./filename-with-no-extension"); could be used
function readJSONFile(filename) {
	var JSONFile = "";
	
	try {
		JSONFile = JSON.parse(fs.readFileSync(__dirname +'/'+ filename, 'utf8'));
	} catch(e) {
		console.log("Error while reading "+ filename +": "+ e);
	}

	return JSONFile;
}

function writeJSONFile(filename, contents) {
	try {
		fs.writeFileSync(__dirname +'/'+ filename, JSON.stringify(contents), 'utf8');
	} catch(e) {
		console.log("Error while writing "+ filename +": "+ e);
	}
}

function readConfigs() {
	var twitterConfigs = readJSONFile("./configs/twitter.json"),
		paramsConfigs = readJSONFile("./configs/params.json");

	return {
		twitterApp : twitterConfigs,
		param : paramsConfigs.param,
		value : paramsConfigs.value
	};
}

function strencode(data) {
  return unescape(encodeURIComponent(JSON.stringify(data)));
}
	
// Using Twitter Streaming API
function grabTwitterFeed() {
	stream = new Tuiter({
	    "consumer_key" : configs.twitterApp.consumer_key
	  , "consumer_secret" : configs.twitterApp.consumer_secret
	  , "access_token_key" : configs.twitterApp.access_token_key
	  , "access_token_secret" : configs.twitterApp.access_token_secret
	});

	stream.filter({ track: configs.value.split(",") }, function(feed) {

		console.log("* Stream started * ");

		feed.on('tweet', function(tweet) {
			io.sockets.emit("tweet", strencode(tweet));
		});

		feed.on('delete', function(del) {
			console.log("Deleted: "+ del);
		});

		feed.on('error', function(err) {
			console.log("Error: "+ err);
			
			fs.open(__dirname +'/errors.log', 'a', 666, function(e, id) {
				fs.write(id, new Date().toJSON() +" "+ err +"\n", null, 'utf8', function() {
					fs.close(id);
				});
			});
		});
	});
}

/*
* Socket.io
*/

var io = require('socket.io').listen(app);

io.configure(function() { 
	io.enable('browser client minification');
	io.set('log level', 1); 
	io.set('transports', [ 
			'websocket',
			'flashsocket',
			'htmlfile',
			'xhr-polling',
			'jsonp-polling'
	]);
});

io.sockets.on('connection', function(client) {
	totUsers++;
	console.log('+ User '+ client.id +' connected, total users: '+ totUsers);

	if ((totUsers > 0) && (stream == '')) {
		grabTwitterFeed();
	}

	client.emit("clientId", { id: client.id });
	client.emit("filters", { param: configs.param, value: configs.value });
	io.sockets.emit("tot", { tot: totUsers });

	client.on('disconnect', function() {
		totUsers--;
		console.log('- User '+ client.id +' disconnected, total users: '+ totUsers);

		if (totUsers == 0) {
			stream = '';
		}

		io.sockets.emit("tot", { tot: totUsers });
	});
});