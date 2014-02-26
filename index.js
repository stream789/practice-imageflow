#!/usr/bin/env node

var fs = require("fs");
var express = require("express");
var colors = require("colors");
var argv = require("optimist").argv;
var images = null;

var app = express();
app.use(express.bodyParser());
app.use(express.static(__dirname + "/public"));
app.use("/lib", express.static(__dirname + "/bower_components"));

function ensureData(cb) {
	if (!images) {
		fs.readFile("data.json", "utf-8", function(err, content) {
			if (err) {
				console.error("fail to parse data".red);
				process.exit(-1);
			}

			images = JSON.parse(content);
			cb(images);

		});
	} else {
		process.nextTick(function() {
			cb(images);
		});
	}
}

app.get(/^\/images$/, function(req, resp) {
	var offset = req.query.offset || 0;
	var length = req.query.length || 10;

	ensureData(function(images) {
		resp.send({
			result: 0,
			images: images.slice(offset, offset + length)
		});
	});
});

var port = argv.p || 5000;
app.listen(port);
console.log("listen on port", port);