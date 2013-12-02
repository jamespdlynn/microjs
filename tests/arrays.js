var micro = require("../");

var arraySchema = {
    byteArray : ['byte'],
    floatArray : {type:'array', byteLength:16, element:{type:'float', unsigned:true, byteLength:4, precision:5}},
    stringArray : {type:'array', maxLength:4, element:'string'}
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
