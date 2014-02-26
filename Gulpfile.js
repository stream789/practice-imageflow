var exec = require("child_process").exec;
var gulp = require("gulp");

gulp.task('clean', function(cb) {
	exec("rm -rf images images.json", function(err, stderr, stdout) {
		cb(null);
	});
});