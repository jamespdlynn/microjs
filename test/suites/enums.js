(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['enums'] = definition(micro);
}(function(micro) {

    var exports = {};

    var enumSchema = {
        align : {type:"enum", values:["left","center","right"]},
        font : {type:"enum", values:["arial","helvetica","times new roman","tahoma","courier new","other"], defaultValue:"other"}
    };

    var enumData = {
        align : "center",
        font : "tahoma"
    };

    var enumBuffer, newEnumData;


    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(enumSchema,"Enum",false);
            test.ok(micro.getSchema("Enum"), "Enum schema found");
        });

        test.done();
    };



    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            enumBuffer = micro.toBinary(enumData,"Enum");
            test.equals(enumBuffer.length, 2, "Enum buffer has correct length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){
            newEnumData = micro.toJSON(enumBuffer,"Enum");

            test.equals(newEnumData.align, enumData.align, "'align' has correct value");
            test.equals(newEnumData.style, enumData.style, "'style' has correct value");
        });

        test.done();
    };

    exports.testDefaults = function(test){

        enumData = {style:"invalid"};

        test.doesNotThrow(function(){
            micro.register(enumSchema,"Enum",false);
            enumBuffer = micro.toBinary(enumData,"Enum");
            test.equals(enumBuffer.length, 2, "Default Enum buffer has correct length");

            newEnumData = micro.toJSON(enumBuffer,"Enum");
            test.equals(newEnumData.align, null, "'align' has correct default value");
            test.equals(newEnumData.font, "other", "'style' has correct default value");
        });

        test.done();
    };

    return exports;
}));





