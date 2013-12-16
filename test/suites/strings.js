(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['strings'] = definition(micro);
}(function(micro) {

    var exports = {};

    var stringSchema = {
        basic : 'string',
        char : 'char',
        len3 : {type:'string', byteLength:3, defaultValue:"bob"}
    };

    var stringData = {
        basic : "frank",//6 bytes
        char : 'frank',//1 bytes
        len3 : "frank" //3 bytes
    };

    var stringBuffer, newStringData;


    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(stringSchema,"String",false);
            test.ok(micro.getSchema("String"), "String schema found");
        });

        test.done();
    };

    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            stringBuffer = micro.toBinary(stringData,"String");
            test.equals(stringBuffer.length, 10, "String buffer has correct length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){

            newStringData = micro.toJSON(stringBuffer, "String");

            for (var key in stringData){
                if (stringData.hasOwnProperty(key)){
                    if (!newStringData.hasOwnProperty(key)){
                        test.ok(false, "Deserialized data has value for key: '"+key+"'");
                    }
                }
            }


            test.equals(newStringData.basic, "frank");
            test.equals(newStringData.char, "f");
            test.equals(newStringData.len3, "fra");
        });

        test.done();
    };

    exports.testSerializePartial = function(test){

        test.doesNotThrow(function(){

            delete stringData.len3;

            stringBuffer = micro.toBinary(stringData,"String");
            test.equals(stringBuffer.length, 10, "String Buffer has correct length");

            newStringData = micro.toJSON(stringBuffer, "String");
            test.equals(newStringData.len3,"bob", "Default value for 'len3' is correct");

        });

        test.done();
    };

    return exports;
}));

