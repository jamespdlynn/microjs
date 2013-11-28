var micro = require("../");

var numberSchema = {
    byte : 'byte',
    short : {type:'short',default:5},
    int : 'int',
    uint : 'uint',
    float8 : 'float8',
    float16 : {type:'float16', precision:2},
    float32 : {type:'float', precision:4, unsigned:true},
    double : 'double'
};


exports.testRegisterSchema = function(test){
    test.doesNotThrow(function(){
        micro.register("Number",numberSchema);

        test.ok(micro.getSchema("Number"), "Schema found");
    });

    test.done();
};

exports.testSerialize = function(test){

    var data = {
        byte : -120,
        short : -1200,
        int : -12000,
        uint : 120000,
        float8 : -Math.PI,
        float16 : -Math.PI,
        float32 : Math.PI,
        double : Math.PI
    };

    test.doesNotThrow(function(){
        var buffer = micro.serialize("Number",data);

        test.equals(buffer.length, 27, "Buffer has correct length");

        test.doesNotThrow(function(){
            var newData = micro.deserialize(buffer);

            for (var key in data){
               if (data.hasOwnProperty(key)){
                   test.ok(newData.hasOwnProperty(key), "Deserialized data does not have value for key: '"+key+"'");
                   test.equals(Math.round(data[key]), Math.round(newData[key]), "Deserialized data value for key: '"+key+"' does not equals old value");
               }
            }


            test.equals(Math.abs(newData.float8).toString().length, 3, "float8 has incorrect precision");
            test.equals(Math.abs(newData.float16).toString().length, 4, "float16 has incorrect precision");
            test.equals(Math.abs(newData.float32).toString().length, 6, "float32 has incorrect precision");
            test.equals(newData.double, Math.PI, "double has correct precision");

        });
    });

    test.done();
};

exports.testSerializePartial = function(test){

    var data = {
        byte : -50,
        uint : 444
    };

    test.doesNotThrow(function(){
        var buffer = micro.serialize("Number",data);

        test.equals(buffer.length, 12, "Buffer has correct length");

        test.doesNotThrow(function(){
            var newData = micro.deserialize(buffer);

            test.equals(Object.keys(newData).length, 5, "Object has incorrect number of keys");
            test.equals(newData.byte, data.byte, "byte incorrect value");
            test.equals(newData.short, numberSchema.short.default, "short incorrect value");
            test.equals(newData.int, 0, "int incorrect value");
            test.equals(newData.uint, data.uint, "uint incorrect value");

        });
    });

    test.done();
};


