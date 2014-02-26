var exec = require("child_process").exec;
var gulp = require("gulp");
var less = require("gulp-less");

gulp.task('clean', function(cb) {
	exec("rm -rf images images.json data.json", function(err, stderr, stdout) {
		cb(null);
	});
});

gulp.task('less', function() {
	return gulp.src("public/style.less")
		.pipe(less({
			paths: ["bower_components/bootstrap/less"]
		}))
		.pipe(gulp.dest("public"));
});

gulp.task('watch-less', function() {
	gulp.watch([
		"bower_components/bootstrap/less/*.less",
		"public/style.less"
	], ['less']);
});