var micro = require("../");

var booleanSchema = {
    bool1 : 'boolean',
    bool2 : 'boolean',
    bool3 : {type:'boolean', defaultValue:true},
    bool4 : 'bit'
};

var booleanData = {
    bool1 : true,
    bool2 : false,
    bool3 : true,
    bool4 : true
};

var booleanBuffer, newBooleanData;


exports.testRegisterSchema = function(test){

    test.doesNotThrow(function(){
        micro.register("Boolean",booleanSchema,{serializeType:false});

        var newSchema = micro.getSchema("Boolean");
        test.ok(newSchema, "Boolean schema not found");

        test.equals(newSchema.length, 1);

        test.equals(newSchema[0].type, "bits");
        test.equals(newSchema[0].names.length, 4);
        test.equals(newSchema[0].defaults.length, 4);
        test.ok(!newSchema[0].defaults[0], "Parsed Schema default value is incorrect");
        test.ok(newSchema[0].defaults[2], "Parsed Schema default value is incorrect");
    });

    test.done();
};

exports.testSerialize = function(test){

    test.doesNotThrow(function(){
        booleanBuffer = micro.toBinary(booleanData, "Boolean");
        test.equals(booleanBuffer.length, 1, "Boolean buffer has incorrect length");
    });

    test.done();
};

exports.testDeserialize = function(test){

    test.doesNotThrow(function(){

        newBooleanData = micro.toJSON(booleanBuffer, "Boolean");

        for (var key in booleanData){
            if (booleanData.hasOwnProperty(key)){
                if (!newBooleanData.hasOwnProperty(key)){
                    test.ok(false, "Deserialized boolean data does not have value for key: '"+key+"'");
                }
                else{
                    test.equals(newBooleanData[key], newBooleanData[key], "Deserialized boolean value for '"+key+"' is incorrect");
                }
            }
        }

    });

    test.done();
};

exports.testSerializePartial = function(test){

    test.doesNotThrow(function(){

        delete booleanData.bool3;
        delete booleanData.bool4;

        booleanBuffer = micro.toBinary(booleanData,"Boolean",1);
        test.equals(booleanBuffer.length, 1, "Boolean Buffer has incorrect length");

        newBooleanData = micro.toJSON(booleanBuffer, "Boolean");

        test.equals(newBooleanData.bool1, booleanData.bool1, "Deserialized value for 'bool1' is incorrect");
        test.ok(newBooleanData.bool3, "Deserialized value for 'bool3' is incorrect");
        test.ok(!newBooleanData.bool4, "Deserialized data for 'bool4' is incorrect");

    });

    test.done();
};

