#!/usr/bin/env node

var fs = require("fs");
var request = require("request");
var _ = require("underscore");
var async = require("async");
var colors = require("colors");
var ProgressBar = require("progress");
var argv = require("optimist").boolean(['j']).argv;

_fetchImages = function(images) {
	var bar = new ProgressBar('fetching images [:bar] :percent :etas', {
		total: images.length,
		width: 50,
		incomplete: ' ',
		complete: '#'
	});

	var results = [];

	function onResultsChanged() {
		bar.tick();
	}

	var count = 0;
	async.eachLimit(images, 5, function(img, callback) {
			function finish(result) {
				return function() {
					results[index] = result;
					onResultsChanged();
					setTimeout(function() {
						callback(null);
					}, 1000);
				};
			}

			if (!img.imageUrl) {
				return finish("fail")();
			}

			var index = count++;
			var dest = "images/image" + index;
			request({
				url: img.imageUrl,
				headers: {
					'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"
				}
			}).pipe(fs.createWriteStream(dest))
				.on('error', finish("fail"))
				.on('finish', finish("success"));
		},
		function(err) {
			var failedImages = _.reduce(results, function(count, result) {
				if (result === "fail") {
					count++;
				}

				return count;
			}, 0);
			console.log("fetching images is done, ".green + (failedImages + " failed.").red);
			process.exit(0);
		});
};

var length = argv._.length > 0 ? argv._[0] : 600;
var onlyJSON = argv.j;
var URL = "http://image.baidu.com/channel/imgs?c=动漫&t=全部&fr=channel&rn=" + length;
request(URL)
	.pipe(fs.createWriteStream("images.json"))
	.on('error', function() {
		console.error("fail to load images' link".red);
		process.exit(-1);
	}).on("finish", function() {
		console.log("fetching images' links is done!".green);
		if (onlyJSON) {
			return;
		}

		fs.readFile("images.json", "utf-8", function(err, content) {
			if (err) {
				throw err;
			}

			var images = JSON.parse(content).imgs;

			if (!fs.existsSync("images")) {
				fs.mkdirSync("images");
			} else {
				var stats = fs.statSync("images");
				if (!stats.isDirectory()) {
					throw "images exist but not directory";
				}
			}

			_fetchImages(images);
		});
	});