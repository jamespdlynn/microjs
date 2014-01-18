require('./test/test.js'); //run tests

var compressor = require('node-minify');

new compressor.minify({
    type: 'gcc',
    fileIn: 'lib/micro.js',
    fileOut: 'dist/micro.js',
    callback: function(err){
        if (err){
            console.log(err);
        }else{
            console.log("Built micro.js");
        }
    }
});

new compressor.minify({
    type: 'gcc',
    fileIn: 'lib/browser-buffer.js',
    fileOut: 'dist/browser-buffer.js',
    callback: function(err){
        if (err){
            console.log(err);
        }else{
            console.log("Built browser-buffer.js");
        }
    }
});


