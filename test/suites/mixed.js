(function(definition) {
    if (typeof module != 'undefined') module.exports = definition(require("../../lib/micro"));
    else this['mixed'] = definition(micro);
}(function(micro) {

    var exports = {};

    var schemas = {
        Car : {
            make : "string",
            model : "string",
            year : "uint16",
            automatic : "boolean",
            engine : {
                type:"object",
                schema:{
                    numCylinders : {type:"int", byteLength:1, defaultValue:4},
                    isDiesel : 'boolean'
                },
                byteLength:2
            },
            passengers : [{type:"object", schema:"Passenger"}]
        },

        Passenger : {
            name : "string",
            age : "uint8",
            isMale : "boolean",
            isDriver : "boolean"
        }
    };

    //39 bytes
    var carData = {
        make : "Ford",  // 5 bytes
        model : "Mustang", // 8 bytes
        year : 2014, // 2 bytes
        automatic : false, // 1 byte
        engine : {  // 2 bytes
            numCylinders : 8,
            isDiesel : false
        },
        passengers : [   // 21 bytes
            {
                name : "John",    // 7 bytes
                age : 38,
                isMale : true,
                isDriver : true
            },
            {
                name : "Mary",   // 7 bytes
                age : 35,
                isMale : true,
                isDriver : false
            },
            {
                name : "Ben",   // 6 bytes
                age : 6,
                isMale : true,
                isDriver : false
            }
        ]
    };

    var carBuffer, newCarData;


    exports.testRegisterSchema = function(test){

        test.doesNotThrow(function(){
            micro.register(schemas);

            test.ok(micro.getSchema("Car"), "Car schema not found");
            test.ok(micro.getSchema("Passenger"), "Passenger schema not found");

        });

        test.done();
    };



    exports.testSerialize = function(test){

        test.doesNotThrow(function(){
            carBuffer = micro.toBinary(carData,"Car");
            test.equals(carBuffer.length, 40, "Car buffer has incorrect length"); //Add a byte for the type
        });

        test.done();
    };

    exports.testDeserialize = function(test){

        test.doesNotThrow(function(){

            newCarData = micro.toJSON(carBuffer);

            for (var key in carData){
                if (carData.hasOwnProperty(key)){
                    test.ok(newCarData.hasOwnProperty(key), "Deserialized car data does not have value for key: '"+key+"'");
                }
            }

        });

        test.done();
    };

    exports.testEngineData = function(test){

        if (!newCarData) return;

        for (var key in carData.engine){
            if (carData.engine.hasOwnProperty(key)){
                if (newCarData.engine.hasOwnProperty(key)){
                    test.equals(newCarData.engine[key], carData.engine[key])
                }
                else{
                    test.ok(false, "Deserialized Engine Data does not have value for key: '"+key+"'");
                }
            }
        }

        test.done();
    };

    exports.testPassengersData = function(test){

        if (!newCarData) return;


        var passengers = carData.passengers,
            newPassengers = newCarData.passengers;

        test.equals(passengers.length, newPassengers.length);

        for (var i=0; i < passengers.length; i++){
            for (var key in passengers[i]){
                if (passengers[i].hasOwnProperty(key)){
                    if (newPassengers[i].hasOwnProperty(key)){
                        test.equals(newPassengers[i][key], passengers[i][key])
                    }
                    else{
                        test.ok(false, "Deserialized Passenger Data does not have value for key: '"+key+"'");
                    }
                }
            }
        }

        test.done();
    };

    exports.testSerializePartial = function(test){

        test.doesNotThrow(function(){

            carBuffer = micro.toBinary(carData,"Car", 5);
            test.equals(carBuffer.length, 6, "Car buffer has incorrect length");

            newCarData = micro.toJSON(carBuffer, "Car");
            test.equals(Object.keys(newCarData).length, 1, "Car has incorrect number or keys");
            test.equals(newCarData.make, "Ford", "Car has incorrect value for 'make'");

        });

        test.done();
    };

    return exports;
}));