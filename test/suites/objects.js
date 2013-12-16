(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['objects'] = definition(micro);
}(function(micro) {

    var exports = {};

    var objectSchema = {
        obj1 : {
           type:"object",
           schema: {
               byte : {type: "int", byteLength:1}
           }
        },

        obj2 : {
            type:"object",
            schema:{
                byte : {type: "int", byteLength:1},

                obj3 : {
                    type:"object",
                    schema:{
                        byte : {type: "int", byteLength:1}
                    }
                },
                obj4 : {
                    type:"object",
                    schema:{
                        byte : {type: "int", byteLength:1}
                    }
                }
            }

        }
    };



    var objectData = {
        obj1 : {byte:1},
        obj2 : {byte:2, obj3: {byte:3}, obj4: {byte:4}}
    };

    var objectBuffer, newObjectData;

    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(objectSchema,"Object",false);
            test.ok(micro.getSchema("Object"), "Object schema not found");
        });

        test.done();
    };



    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            objectBuffer = micro.toBinary(objectData,"Object");
            test.equals(objectBuffer.length, 4, "Object buffer has incorrect length");
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){
            newObjectData = micro.toJSON(objectBuffer,"Object");


            for (var key in objectData){
                if (objectData.hasOwnProperty(key)){
                    test.ok(newObjectData.hasOwnProperty(key), "Deserialized object data does not have value for key: '"+key+"'");
                }
            }

            test.equals(newObjectData.obj1.byte, 1);
            test.equals(newObjectData.obj2.byte, 2);
            test.equals(newObjectData.obj2.obj3.byte, 3);
            test.equals(newObjectData.obj2.obj4.byte, 4);
        });

        test.done();
     };


    exports.testSerializePartial = function(test){
        objectSchema.obj2.byteLength = 2;

        test.doesNotThrow(function(){

            micro.register(objectSchema, "Object", false);

            objectBuffer = micro.toBinary(objectData,"Object");
            test.equals(objectBuffer.length, 3, "Partial Object buffer has incorrect length");

            newObjectData = micro.toJSON(objectBuffer,"Object");
            test.equals(Object.keys(newObjectData.obj1).length, 1, "obj1 has incorrect number or keys");
            test.equals(Object.keys(newObjectData.obj2).length, 2, "obj2 has incorrect number or keys");

        });

        test.done();
    };

    return exports;
}));