const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const log = require('fancy-log');
const uglify = require('gulp-uglify');
const minifyHTML = require('gulp-htmlmin');
const connect = require('gulp-connect');
const rename = require('gulp-rename');

const paths = {
    caniuseEmbed: "src/caniuse-embed.js",
    embedStyle: "src/embed/scss/style.scss",
    embedScript: "src/embed/script.js",
    embedHTML: "src/embed/index.html"
};

function script() {
    return gulp.src(paths.caniuseEmbed)
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public'))
        .pipe(connect.reload());
}

function scriptEmbed() {
    return gulp.src(paths.embedScript)
        .pipe(uglify())
        .pipe(gulp.dest('public/embed'))
        .pipe(connect.reload());
}

function sassTask() {
    return gulp.src(paths.embedStyle)
        .pipe(sass({ style: 'compressed' })
        .on('error', log))
        .pipe(gulp.dest('public/embed'))
        .pipe(connect.reload());
}

function minifyHtml() {
    return gulp.src(paths.embedHTML)
        .pipe(minifyHTML({
            removeAttributeQuotes: true,
            removeComments: true,
            collapseWhitespace: true
        }))
        .pipe(gulp.dest('public/embed'))
        .pipe(connect.reload());
}

function connectServer() {
    return connect.server({
        root: 'public',
        port: 8000,
        livereload: true
    });
}

function watch() {
    gulp.watch(paths.caniuseEmbed, script);
    gulp.watch(paths.embedScript, scriptEmbed);
    gulp.watch("src/embed/scss/*.scss", sassTask);
    gulp.watch(paths.embedHTML, minifyHtml);
}

exports.default = gulp.series(script, scriptEmbed, sassTask, minifyHtml, watch);
exports.build = gulp.series(script, scriptEmbed, sassTask, minifyHtml);
exports.full = gulp.parallel(connectServer, gulp.series(script, scriptEmbed, sassTask, minifyHtml, watch));
