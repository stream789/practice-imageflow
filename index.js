#!/usr/bin/env node

var fs = require("fs");
var express = require("express");
var colors = require("colors");
var _ = require("underscore");
var argv = require("optimist").argv;

var app = express();
app.use(express.bodyParser());

app.use(express.static(__dirname + "/public"));
app.use("/lib", express.static(__dirname + "/bower_components"));
app.use("/static/images", express.static(__dirname + "/images"));

var images = null;

function ensureData(cb) {
	if (!images) {
		fs.readFile("data.json", "utf-8", function(err, content) {
			if (err) {
				console.error("fail to parse data".red);
				process.exit(-1);
			}

			images = JSON.parse(content);
			_.each(images, function(img) {
				img.path = "/static/" + img.path;
			});
			cb(images);
		});
	} else {
		process.nextTick(function() {
			cb(images);
		});
	}
}

app.get(/^\/images$/, function(req, resp) {
	var offset = parseInt(req.query.offset || "0");
	var length = parseInt(req.query.length || "10");

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