var micro = require("../");

var arraySchema = {
    byteArray : ['byte'],
    floatArray : {type:'array', byteLength:16, element:{type:'float', unsigned:true, byteLength:4, precision:5}},
    stringArray : {type:'array', element:'string'},
    arrayArray : [['short']]
};

var arrayData = {
    byteArray : [-2,-1,0,1,2], // 6 bytes
    floatArray : [Math.PI, Math.PI, Math.PI, Math.PI, Math.PI],  //16 bytes (max byte length)
    stringArray : ["a","ab","abc","abcd","abcde"], //21 bytes
    arrayArray : [[100,200],[300,400],[500,600]]  //16 bytes
};

var arrayBuffer, newArrayData;


exports.testRegisterSchema = function(test){

    test.doesNotThrow(function(){
        micro.register("Array",arraySchema,{serializeType:false});
        test.ok(micro.getSchema("Array"), "Array schema not found");
    });

    test.throws(function(){
        micro.register("BadSchema", {badArray : {type:'array', byteLength:3, element:'int16'}});
        test.ok(!micro.getSchema("BadSchema"), "Array schema not found");
    });

    test.done();
};



exports.testSerialize = function(test){

    test.doesNotThrow(function(){
        arrayBuffer = micro.toBinary(arrayData,"Array");
        test.equals(arrayBuffer.length, 59, "Array buffer has incorrect length");
    });

    test.done();
};

exports.testDeserialize = function(test){

    test.doesNotThrow(function(){
        newArrayData = micro.toJSON(arrayBuffer,"Array");
        for (var key in arrayData){
            if (arrayData.hasOwnProperty(key)){
                 test.ok(newArrayData.hasOwnProperty(key), "Deserialized data does not have value for key: '"+key+"'");
            }
        }

        test.equals(newArrayData.byteArray.length, 5, "Deserialized byte array has incorrect length");
        test.equals(newArrayData.floatArray.length, 4, "Deserialized float array has incorrect length");
        test.equals(newArrayData.stringArray.length, 5, "Deserialized string array has incorrect length");
        test.equals(newArrayData.arrayArray.length, 3, "Deserialized array array has incorrect length");


        var i, j;

        for(i=0; i <5; i++){
            test.equals(newArrayData.byteArray[i],arrayData.byteArray[i]);
        }

        for(i=0; i <4; i++){
            test.equals(Math.round(newArrayData.floatArray[i]),Math.round(arrayData.floatArray[i]));
        }

        for(i=0; i <4; i++){
            test.equals(newArrayData.stringArray[i],arrayData.stringArray[i]);
        }

        for(i=0; i <3; i++){
           for (j=0; j<3; j++){
               test.equals(newArrayData.arrayArray[i][j],arrayData.arrayArray[i][j]);
           }
        }
    });

    test.done();
};


