#!/usr/bin/env node

var fs = require("fs");
var request = require("request");
var easyimg = require("easyimage");
var _ = require("underscore");
var async = require("async");
var colors = require("colors");
var ProgressBar = require("progress");
var sizeOf = require("image-size");
var argv = require("optimist").boolean(['j']).argv;

_fetchImages = function(images) {
	var bar = new ProgressBar('fetching images [:bar] :percent :etas', {
		total: images.length,
		width: 50,
		incomplete: ' ',
		complete: '#'
	});

	function onResultsChanged() {
		bar.tick();
	}

	var count = 0;
	var results = [];
	async.eachSeries(images, function(img, callback) {
			var index = count++;
			var dest = "images/image" + index;
			var thumb = "thumbnail/thumb" + index;
			var desc = img.desc;

			function complete() {
				onResultsChanged();
				setTimeout(function() {
					callback(null);
				}, 500);
			}

			function fail() {
				results[index] = null;
				complete();
			}

			function success() {
				var dimension = sizeOf(dest);
				var thumbWidth = 180;
				var thumbHeight = thumbWidth / dimension.width * dimension.height;
				easyimg.resize({
					src: dest,
					dst: thumb,
					width: thumbWidth,
					height: thumbHeight
				}, function(err) {
					if (err) {
						console.error(err);
						return fail();
					}

					results[index] = {
						id: index,
						path: dest,
						thumbnail: thumb,
						desc: desc,
						thumbWidth: thumbWidth,
						thumbHeight: thumbHeight,
						width: dimension.width,
						height: dimension.height
					};
					complete();
				});
			}

			request({
				url: img.imageUrl,
				headers: {
					'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"
				}
			}).pipe(fs.createWriteStream(dest))
				.on('error', fail)
				.on('unpipe', function() {
					console.log("unpipe!!!");
				})
				.on("pipe", function() {
					console.log("pipe");
				})
				.on('finish', success);
		},
		function(err) {
			var successfulResults = _.filter(results, function(result) {
				return result;
			});
			var failedImages = images.length - successfulResults.length;
			console.log("fetching images is done, ".green + (failedImages + " failed.").red);
			var json = JSON.stringify(successfulResults);
			fs.writeFile("data.json", json, function(err) {
				if (err) {
					throw err;
				}

				console.log("data fetched".green);
				process.exit(0);
			});
		});
};

var DEFAULT_LENGTH = 50;
var length = argv._.length > 0 ? argv._[0] : DEFAULT_LENGTH;
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

			images = images.slice(0, images.length - 1);
			_fetchImages(images);
		});
	});