(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['numbers'] = definition(micro);
}(function(micro) {

    var exports = {};


    var integerSchema = {
        byte : 'byte',
        short : {type:'int', byteLength:2, defaultValue:5},
        int : 'int',
        uint : 'uint'
    };

    var floatSchema = {
        float8 : 'float8',
        float16 : {type:'float', byteLength:2, precision:2},
        float32 : {type:'float', byteLength:4, precision:4, unsigned:true},
        double : 'double'
    };

    var integerData = {
        byte : -120,
        short : -1200,
        int : -12000,
        uint : 120000
    };

    var floatData = {
        float8 : -Math.PI,
        float16 : -Math.PI,
        float32 : Math.PI,
        double : Math.PI
    };

    var integerBuffer, floatBuffer, newIntegerData, newFloatData;


    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(integerSchema,"Integer",{serializeType:false});
            micro.register(floatSchema,"Float", {serializeType:false});

            test.ok(micro.getSchema("Integer"), "Integer schema found");
            test.ok(micro.getSchema("Float"), "Float schema found");
        });

        test.done();
    };

    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            integerBuffer = micro.toBinary(integerData, "Integer");
            floatBuffer =  micro.toBinary(floatData, "Float");
            test.equals(integerBuffer.length, 11, "Integer buffer has correct length");
            test.equals(floatBuffer.length, 15, "Float buffer has correct length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){

            newIntegerData = micro.toJSON(integerBuffer, "Integer");
            newFloatData = micro.toJSON(floatBuffer, "Float");

            var key;

            for (key in integerData){
                if (integerData.hasOwnProperty(key)){
                    if (newIntegerData.hasOwnProperty(key)){
                        test.equals(Math.round(integerData[key]), Math.round(newIntegerData[key]), "Deserialized data value for key: '"+key+"' does not equal old value");
                    }else{
                        test.ok(false, "Deserialized data has value for key: '"+key+"'");
                    }
                }
            }
    
            for (key in floatData){
                if (floatData.hasOwnProperty(key)){
                    if (newFloatData.hasOwnProperty(key)){
                        test.equals(Math.round(floatData[key]), Math.round(newFloatData[key]), "Deserialized data value for key: '"+key+"' does not equal old value");
                    }else{
                        test.ok(false, "Deserialized data has value for key: '"+key+"'");
                    }
                }
            }
        });
    
        test.done();
    }
    
    exports.testFloatPrecision = function(test){
        test.equals(Math.abs(newFloatData.float8).toString().length, 3, "float8 has correct precision");
        test.equals(Math.abs(newFloatData.float16).toString().length, 4, "float16 has correct precision");
        test.equals(Math.abs(newFloatData.float32).toString().length, 6, "float32 has correct precision");
        test.equals(Math.abs(newFloatData.double).toString().length, Math.PI.toString().length, "double has correct precision");
    
        test.done();
    }
    
    exports.testSerializePartial = function(test){
    
        delete integerData.short;
        delete integerData.int;
    
        test.doesNotThrow(function(){
    
            integerBuffer = micro.toBinary(integerData,"Integer");
            test.equals(integerBuffer.length, 11, "Integer Buffer has correct length");
    
            newIntegerData = micro.toJSON(integerBuffer, "Integer");
            test.equals(newIntegerData.short,integerSchema.short.defaultValue, "Default value for 'short' is correct");
    
            floatBuffer = micro.toBinary(floatData,"Float",3);
            test.equals(floatBuffer.length, 3, "Float Buffer has correct length");
    
            newFloatData = micro.toJSON(floatBuffer, "Float");
            test.equals(Object.keys(newFloatData).length,3, "New Float Data has correct number of properties");
    
        });
    
        test.done();
    };
    
    return exports;
}));


