var micro = require("../lib/micro");

var stringSchema = {
    basic : 'string',
    ascii : {type:'string', encoding:'ascii'},
    char : 'char',
    len3 : {type:'string', byteLength:3, defaultValue:"bob"}
};

var stringData = {
    basic : "frank",
    ascii : "frank",
    char : 'frank',
    len3 : "frank"
};

var stringBuffer, newStringData;


exports.testRegisterSchema = function(test){

    test.doesNotThrow(function(){
        micro.register("String",stringSchema,{serializeType:false});
        test.ok(micro.getSchema("String"), "String schema not found");
    });

    test.done();
};

exports.testSerialize = function(test){

    test.doesNotThrow(function(){
        stringBuffer = micro.toBinary(stringData,"String");
        test.equals(stringBuffer.length, 16, "String buffer has incorrect length");
    });

    test.done();
};

exports.testDeserialize = function(test){

    test.doesNotThrow(function(){

        newStringData = micro.toJSON(stringBuffer, "String");

        for (var key in stringData){
            if (stringData.hasOwnProperty(key)){
                if (!newStringData.hasOwnProperty(key)){
                    test.ok(false, "Deserialized data does not have value for key: '"+key+"'");
                }
            }
        }

        test.equals(newStringData.basic, "frank");
        test.equals(newStringData.ascii, "frank");
        test.equals(newStringData.char, "f");
        test.equals(newStringData.len3, "fra");


    });

    test.done();
}

exports.testSerializePartial = function(test){

    test.doesNotThrow(function(){

        delete stringData.ascii;

        stringBuffer = micro.toBinary(stringData,"String",7);
        test.equals(stringBuffer.length, 7, "String Buffer has incorrect length");

        newStringData = micro.toJSON(stringBuffer, "String");

        test.equals(Object.keys(newStringData).length, 3, "Partial String Data has incorrect number of keys");
        test.equals(newStringData.ascii,"", "Default value for 'ascii' is incorrect");

    });

    test.done();
};

