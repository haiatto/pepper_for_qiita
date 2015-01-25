var gulp = require('gulp');
var jshint = require('gulp-jshint');
var express = require('express');

// サイトのルートディレクトリ
var ROOT_DIR = '.';

// JavaScriptソースファイルパターン
var JS_GLOB = ROOT_DIR + '/js/**/*.js';

// サーバーのポート番号
var SERVER_PORT = 8081;

gulp.task('default', [
    'jshint',
    'server',
    'watch'
], function() {});
 
// JsHintによるチェック
gulp.task('jshint', function() {
    gulp.src(JS_GLOB)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// ファイル監視
gulp.task('watch', function() {
    gulp.watch(JS_GLOB, ['jshint']);
});

// HTTPサーバーの起動
gulp.task('server', function() {
    var app = express();
    app.use('/', express.static(ROOT_DIR));
    app.listen(SERVER_PORT);
});

