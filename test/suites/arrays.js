(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['arrays'] = definition(micro);
}(function(micro) {

    var exports = {};

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
            micro.register(arraySchema,"Array",{serializeType:false});
            test.ok(micro.getSchema("Array"), "Array schema found");
        });



        test.throws(function(){
            var badSchema = {
                badArray : {type:'array', byteLength:3, element:'int16'}
            };

            micro.register(badSchema, "BadSchema");
        });

        test.ok(!micro.getSchema("BadSchema"));

        test.done();
    };



    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            arrayBuffer = micro.toBinary(arrayData,"Array");
            test.equals(arrayBuffer.length, 59, "Array buffer has correct length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){
            newArrayData = micro.toJSON(arrayBuffer,"Array");
            for (var key in arrayData){
                if (arrayData.hasOwnProperty(key)){
                    test.ok(newArrayData.hasOwnProperty(key), "Deserialized data has value for key: '"+key+"'");
                }
            }

            test.equals(newArrayData.byteArray.length, 5, "Deserialized byte array has correct length");
            test.equals(newArrayData.floatArray.length, 4, "Deserialized float array has correct length");
            test.equals(newArrayData.stringArray.length, 5, "Deserialized string array has correct length");
            test.equals(newArrayData.arrayArray.length, 3, "Deserialized array array has correct length");

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

    return exports;
}));





