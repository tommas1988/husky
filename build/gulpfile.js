const glob = require('glob');
const path = require('path');
const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const mainBowerFiles = require('main-bower-files');

const rootDir = '../';
const srcDir = '../src';
const npmDir = '../node_modules';
const bowerDir = '../bower_components';
const electronSrc = '../dist/electron/resources/app';

// compile app css
gulp.task('app-css', function () {
    return gulp.src('../src/views/scss/*.scss')
        .pipe(plugins.concat('app.scss'))
        .pipe(
        plugins.sass({
            includePaths: [
                path.resolve(srcDir),
                path.resolve(npmDir),
                path.resolve(bowerDir),
            ]
        }).on('error', plugins.sass.logError)
        )
        .pipe(gulp.dest(electronSrc + '/css'));
});

// merge vendor css into one file
gulp.task('vendor-css', function () {
    let cssFiles = mainBowerFiles({
        filter: [
            '**/*.css',
            '!**/*.min.css',
            '!/codemirror',
            '!/code-mirror-themes'
        ],
        paths: rootDir
    });

    cssFiles.push(npmDir + '/codemirror/lib/codemirror.css');

    console.log(cssFiles);

    return gulp.src(cssFiles)
        .pipe(plugins.concat('vendor.css'))
        .pipe(gulp.dest(electronSrc + '/css'));
});

gulp.task('vendor-fonts', function () {
    return gulp.src(mainBowerFiles({
        filter: [
            '**/*.otf',
            '**/*.eot',
            '**/*.ttf',
            '**/*.woff',
            '**/*.woff2',
            '**/*.svg'
        ],
        paths: rootDir
    }))
        .pipe(gulp.dest(electronSrc + '/fonts'));
});

gulp.task('build-css', ['app-css', 'vendor-css', 'vendor-fonts']);

const ts = require('gulp-typescript');
const babel = require('gulp-babel');
// convert ts to es5
gulp.task('app-js', function () {
    // remove this declaration file to avoid ts compile errors
    rimraf.sync(npmDir + '/fs-promise/index.d.ts');

    let tsProject = ts.createProject('../tsconfig.json');
    let result = gulp.src('../src/**/*.ts')
        .pipe(tsProject())
        .js
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(gulp.dest('../dist/electron/resources/app/src'));
});

// merge vendor js into one file
gulp.task('vendor-js', function () {
    let jsFiles = mainBowerFiles({
        filter: [
            '**/*.js',
            '!**/*.min.js',
            '!**/jquery/**/*.js',
            '!/codemirror',
            '!/code-mirror-themes'
        ],
        paths: rootDir
    });

    console.log(jsFiles);

    return gulp.src(jsFiles)
        .pipe(plugins.concat('vendor.js'))
        .pipe(gulp.dest(electronSrc + '/js'));
});

gulp.task('build-js', ['app-js', 'vendor-js']);

gulp.task('templates', () => {
    return gulp.src('../src/views/templates/**/*')
        .pipe(gulp.dest(electronSrc + '/src/views/templates'));
});

gulp.task('main-page', function () {
    return gulp.src('../src/index.html')
        .pipe(gulp.dest(electronSrc));
});

gulp.task('package.json', function () {
    return gulp.src('../package.json')
        .pipe(gulp.dest(electronSrc));
});

gulp.task('install-deps', ['package.json'], function () {
    return gulp.src(electronSrc + '/' + 'package.json')
        .pipe(gulp.dest(electronSrc))
        .pipe(plugins.install({
            npm: '--production'
        }));
});

gulp.task('build', [
    'build-css',
    'build-js',
    'templates',
    'main-page',
    'install-deps',
], function () {
    //TODO: rename electron to app name
});

const electron = require('gulp-atom-electron');
gulp.task('get-electron', function () {
    return gulp.src('../package.json')
        .pipe(electron({
            version: '1.6.5',
            platform: 'win32',
            arch: 'x64'
        }))
        .pipe(gulp.dest('../dist/electron'));
});

const tmpdir = require('os').tmpdir();
const rimraf = require('rimraf');
const notebookDir = tmpdir + '/notebooks';
gulp.task('create-test-notes', function () {
    rimraf.sync(notebookDir);

    return gulp.src('../test/notebooks/{.*,**}')
        .pipe(gulp.dest(notebookDir));
});