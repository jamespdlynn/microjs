MicroJS
==========================

A protocol buffer for javascript used to serialize JSON into miniature binary packets.


Why use MicroJS?
--------

By using predefined schemas to map your JSON objects into binary array buffers, MicroJS achieves on average a much better compression rate
than standard string compression libraries such as GZip (with a much lower computational cost).

This makes it an excellent tool for applications or games that use web sockets to rapidly transfer large amounts of data between the client and server.

#### Average compression rates:

- zlib/gzip: **73%**
- microjs: **83%**


Tested In
--------

- Node.js (0.10.18)
- Google Chrome (31)
- Mozilla Firefox (23)
- Safari (6)
- Internet Explorer (11)


Installation
---------

### Node.js

In your project root:

    $ npm install microjs

Then in your code:

    var micro = require('microjs');


### Browser

Copy **BOTH** the "micro.js" and "browser-buffer.js" file into your public directory.

Then in your HTML:

    <script type="text/javascript" src="browser-buffer.js"></script>
    <script type="text/javascript" src="micro.js"></script>

Or optionally you can load one or both libraries as modules, for example:

    require(['browser-buffer','micro'], function(Buffer, micro){
      ...
    });

Schemas
---------

####More documentation coming soon!

For now please look in the the "benchmarks" and "examples" directories for direction as to how to properly register schemas, and serialize/deserialize JSON data.



