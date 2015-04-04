/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app');

var app = new EmberApp();

// LocalStorage Adapter
app.import('bower_components/ember-localstorage-adapter/localstorage_adapter.js');

// Mousetrap
app.import('bower_components/mousetrap/mousetrap.js');

// Font Awesome
app.import('bower_components/font-awesome/font-awesome.scss');

app.import('bower_components/font-awesome/fonts/fontawesome-webfont.eot', { destDir: 'fonts' });
app.import('bower_components/font-awesome/fonts/fontawesome-webfont.svg', { destDir: 'fonts' });
app.import('bower_components/font-awesome/fonts/fontawesome-webfont.ttf', { destDir: 'fonts' });
app.import('bower_components/font-awesome/fonts/fontawesome-webfont.woff', { destDir: 'fonts' });
app.import('bower_components/font-awesome/fonts/fontawesome-webfont.woff2', { destDir: 'fonts' });
app.import('bower_components/font-awesome/fonts/FontAwesome.otf', { destDir: 'fonts' });

// Pixi.js as Renderer
app.import('bower_components/pixi.js/bin/pixi.dev.js');

module.exports = app.toTree();
