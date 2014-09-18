var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var sweetjs = require('gulp-sweetjs');
var header = require('gulp-header');

gulp.task('compile', function() {
  gulp.src(['tests/**/*.js', 'foo.js'])
    .pipe(sourcemaps.init())
    .pipe(sweetjs({
      readableNames: true,
      modules: ['es6-macros']
    }))
    .pipe(header('require("source-map-support");'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build'));
});

gulp.task('watch', function() {
  gulp.watch(['tests/**/*.js', 'foo.js'], ['compile']);
});

gulp.task('default', ['compile']);
