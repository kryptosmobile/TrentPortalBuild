var gulp = require('gulp');
var uglify = require('gulp-uglify-es').default;
var uglifyCss = require('gulp-uglifycss');
var pump = require('pump');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var sequence = require('gulp-sequence');
var gulpif = require('gulp-if');
var source = require('vinyl-source-stream');
var request = require('request');
var merge = require('merge2');
var buffer = require('gulp-buffer');
var connect = require('gulp-connect');

var distDest = 'dist/static';

var pluginscripts = ['libs/jquery/dist/jquery.min.js',
    'libs/angular/angular.min.js',
    'libs/angular-route/angular-route.min.js',
    'libs/async/dist/async.min.js',
    'libs/bootstrap/dist/js/bootstrap.js',
    'libs/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.js',
    'libs/lodash/dist/lodash.min.js',
    'libs/rrule/lib/rrule.js',
    'libs/angular-drag-and-drop-lists/angular-drag-and-drop-lists.js',
    'libs/momentjs/min/moment.min.js',
    'libs/jquery-confirm2/dist/jquery-confirm.min.js',
    'app/assets/js/blockUI.js',
    'app/assets/js/jStorage.js',
    'app/assets/js/owl.carousel.js',
    'libs/swiper/dist/js/swiper.min.js',
];


gulp.task('pluginjs', function () {
    return gulp.src(pluginscripts)
        .pipe(concat('pluginjs.js'))
        .pipe(gulp.dest(distDest))
        .pipe(rename('pluginjs.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(distDest));
});

var mobilescripts = [
    'app/app.js',
    'app/app.routes.js',
    'app/shared/js/*.js',
    'app/components/applet/*.js',
    'app/components/cmspage/*.js',
    'app/components/main/*.js',
    'app/components/groups/*.js',
    ];

//var strophescipts = ['public/assets/js/strophe/strophe.min.js',  'public/assets/js/strophe/plugins/strophe.x.js', 'public/assets/js/strophe/plugins/strophe.chatstates.js',  'public/assets/js/strophe/plugins/strophe.rsm.min.js', 'public/assets/js/strophe/plugins/strophe.mam.js', 'public/assets/js/strophe/plugins/strophe.muc.js', 'public/assets/js/strophe/plugins/strophe.receipts.js', 'public/assets/js/strophe/plugins/strophe.roster.min.js', 'public/assets/js/strophe/plugins/strophe.si-filetransfer.js'];

/*gulp.task('strophe-all', function () {
    return gulp.src(strophescipts).pipe(concat('strophe-all.js')).pipe(gulp.dest('public/assets/js/')).pipe(rename('strophe-all.min.js')).pipe(uglify()).pipe(gulp.dest('public/assets/js/'));
})*/

gulp.task('mobilejs', function () {
    return gulp.src(mobilescripts)
        .pipe(concat('mobilejs.js'))
        .pipe(gulp.dest(distDest))
        .pipe(rename('mobilejs.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(distDest));
});

var plugincss = ['libs/bootstrap/dist/css/bootstrap.min.css',
    'libs/jquery-confirm2/dist/jquery-confirm.min.css',
    'libs/fontawesome/css/font-awesome.min.css',
    'libs/jquery-ui/themes/base/jquery-ui.css',
    'libs/fullcalendar/dist/fullcalendar.min.css' ,
    'libs/swiper/dist/css/swiper.css',
    'libs/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.css',
    'app/assets/css/owl.carousel.css',
];

gulp.task('plugincss', function () {
    return gulp.src(plugincss)
        .pipe(concat('plugincss.css'))
        .pipe(gulp.dest(distDest))
        .pipe(rename('plugincss.min.css'))
        .pipe(uglifyCss())
        .pipe(gulp.dest(distDest));
});


var mobilecss = [
    'app/assets/css/customCss.css',
    'app/assets/css/main.css'
];

gulp.task('mobilecss', function () {
    return gulp.src(mobilecss)
        .pipe(concat('mobilecss.css'))
        .pipe(gulp.dest(distDest))
        .pipe(rename('mobilecss.min.css'))
        .pipe(uglifyCss())
        .pipe(gulp.dest(distDest));
});

gulp.task('clean', function () {
    return gulp.src(distDest, { read: false })
        .pipe(clean());
});

/*gulp.task('compress', function (cb) {

    ], cb);
});*/


gulp.task('default', sequence('clean', ['pluginjs',
    'mobilejs', 'plugincss', 'mobilecss']));

gulp.task('dev', sequence(['mobilejs', 'mobilecss','connect']));


gulp.task('connect', function () {
  connect.server({
    root: '',
    port: 8888
  });
});
