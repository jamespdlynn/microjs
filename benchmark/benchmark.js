var fs = require("fs");
var zlib = require("zlib");
var micro = require("../lib/micro.js");

micro.maxBufferLength = 5000;
micro.register({

    game : {
        latency : "uint16",
        currentZone : {type:"object", schema:"zone"},
        playerId : "uint8"
    },

    zone : {
        id : "uint8",
        players : [{type:"object", schema:"player"}]
    },

    player : {
        id : "uint8",
        posX : "uint16",
        posY : "uint16",
        angle : {type:"float", byteLength:1, precision:1},
        angle2 : {type:"float", byteLength:1, precision:1},
        velocity : {type:"float", unsigned:true, byteLength:2, precision:2},
        velocity2 : {type:"float", unsigned:true, byteLength:2, precision:2},
        isAccelerating : "boolean"
    },

    menu : {
        header : "String",
        items : [{
            type:"object",
            allowNull:true,
            schema:{
                id:"uint8",
                label:"String"
            }
        }]
    },

    user : {
        id : "uint",
        guid : {type:"string", byteLength:36},
        isActive : "boolean",
        balance : {type:"float", byteLength:4, precision:2},
        picture : {type:"string", byteLength:7},
        age : "uint8",
        name : "string",
        gender : {type:"enum", values:["male","female"]},
        company : "string",
        email : "string",
        phone : {type:"string", byteLength:14},
        address : "string",
        registered : "date",
        latitude : {type:"float", byteLength:4, precision:6},
        longitude : {type:"float", byteLength:4, precision:6},
        tags : ["string"],
        friends : [{
            type : "object",
            schema : {
                id : "uint8",
                name : "string"
            }
        }],
        randomArrayItem : {type:"enum", values:["apple","lemon","cherry","orange","banana"]}
    },

    users : {
        id : "string",
        users : [{type:"object", schema:"user"}]
    },

    widget : {
        debug : {type:"enum", values:["on","off"]},
        window : {type:"object", schema:{
            title : "string",
            name : "string",
            width : "uint16",
            height : "uint16"
        }},
        image : {type:"object", schema:{
            src : "string",
            name : "string",
            hOffset : "uint8",
            vOffset : "uint8",
            alignment : {type:"enum", values:["left","center","right"]}
        }},
        text : {type:"object", schema:{
            data : "string",
            size : "uint8",
            style : {type:"enum", values:["normal","bold","italic","bold-italic"]},
            name : "string",
            hOffset : "uint8",
            vOffset : "uint8",
            alignment :{type:"enum", values:["left","center","right"]},
            onMouseUp : "string"
        }}
    }


});

var gzip = zlib.createGzip();
var list = fs.readdirSync(__dirname+"/json");

var totalZLib = 0,
    totalMicroJS = 0;

(function next(index){

    if (index >= list.length){
        console.log("\nAverage ZLib Compression: "+Math.round(totalZLib/list.length)+"%");
        console.log("Average MicroJS Compression: "+Math.round(totalMicroJS/list.length)+"%");

        process.exit();
    }

    var fileName = list[index];

    console.log("\n-"+fileName+"-");

    var path =  __dirname+"/json/"+fileName;
    var schemaName = fileName.substring(0, fileName.indexOf("."));
    var json = fs.readFileSync(path, {encoding:"utf8"});

    var uncompressed = fs.statSync(path).size;

    console.log("Uncompressed: "+uncompressed+" bytes");

    var startTime, timeDiff, percentCompressed, microBuffer;

    startTime = process.hrtime();
    zlib.deflate(json, function(err, buffer){

        timeDiff = process.hrtime(startTime)[1] / 1e6;
        percentCompressed = (1 - buffer.length/uncompressed) * 100;
        totalZLib +=  percentCompressed;

        console.log("ZLib: "+buffer.length +" bytes ("+Math.round(percentCompressed)+"%) : "+timeDiff+" ms");

        startTime = process.hrtime();
        microBuffer = micro.toBinary(json,schemaName);
        timeDiff = process.hrtime(startTime)[1] / 1e6;
        percentCompressed  = (1 - microBuffer.length/uncompressed) * 100;

        console.log("MicroJS: "+microBuffer.length+" bytes ("+Math.round(percentCompressed)+"%) : "+timeDiff+" ms");

        totalMicroJS += percentCompressed;

        fs.writeFileSync(__dirname+"/"+fileName, JSON.stringify(micro.toJSON(microBuffer)));
        next(index+1);
    });



}(0));




