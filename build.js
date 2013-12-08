var reporter = require('nodeunit').reporters.default;
var compressor = require('node-minify');

reporter.run(['test']);

new compressor.minify({
    type: 'gcc',
    fileIn: 'lib/micro.js',
    fileOut: 'bin/micro.js',
    callback: function(err){
        console.log(err);
    }
});

new compressor.minify({
    type: 'gcc',
    fileIn: 'lib/browser-buffer.js',
    fileOut: 'bin/browser-buffer.js',
    callback: function(err){
        console.log(err);
    }
});


