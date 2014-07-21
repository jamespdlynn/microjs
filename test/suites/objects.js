(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['objects'] = definition(micro);
}(function(micro) {

    var exports = {};

    var objectSchema = {
        obj1 : {
           type:"object",
           schema: {
               byte : {type: "int", byteLength:1, defaultValue:1}
           }
        },

        obj2 : {
            type:"object",
            schema: {
                byte : {type: "int", byteLength:1, defaultValue:2}
            },
            allowNull : true
        },

        obj3 : {
            type:"object",
            schema:{
                byte : {type: "int", byteLength:1, defaultValue:3},

                obj4 : {
                    type:"object",
                    schema:{
                        byte : {type: "int", byteLength:1, defaultValue:4}
                    }
                },
                obj5 : {
                    type:"object",
                    schema:{
                        byte : {type: "int", byteLength:1, defaultValue:5}
                    }
                }
            }

        }
    };



    var objectData = {
        obj1 : {byte:1}, //1 byte
        obj2 : null, // 1 byte
        obj3 : {byte:2, obj4: {byte:3}, obj5: {byte:4}}  // 3 bytes
    };

    var objectBuffer, newObjectData;

    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(objectSchema,"Object",{serializeType:false});
            test.ok(micro.getSchema("Object"), "Object schema not found");
        });



        test.done();
    };



    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            objectBuffer = micro.toBinary(objectData,"Object");
            test.equals(objectBuffer.length, 5, "Object buffer has incorrect length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){
            newObjectData = micro.toJSON(objectBuffer,"Object");

            test.equals(newObjectData.obj1.byte, 1);
            test.equals(newObjectData.obj2, null);
            test.equals(newObjectData.obj3.byte, 2);
            test.equals(newObjectData.obj3.obj4.byte, 3);
            test.equals(newObjectData.obj3.obj5.byte, 4);
        });

        test.done();
     };


    exports.testSerializePartial = function(test){
        delete objectData.obj1;
        delete objectData.obj2;
        objectSchema.obj3.byteLength = 2;

        test.doesNotThrow(function(){

            micro.register(objectSchema, "Object", {serializeType:false});

            objectBuffer = micro.toBinary(objectData,"Object");
            test.equals(objectBuffer.length, 4, "Partial Object buffer has incorrect length");

            newObjectData = micro.toJSON(objectBuffer,"Object");
            test.equals(newObjectData.obj1.byte, 1, "obj1 has correct default value");
            test.equals(newObjectData.obj2, null, "obj2 has correct default value");
            test.equals(Object.keys(newObjectData.obj3).length, 2, "obj3 has incorrect number or keys");


        });

        test.done();
    };

    return exports;
}));