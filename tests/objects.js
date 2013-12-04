var micro = require("../");

var carSchema = {
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
};


var passengerSchema = {
    name : "string",
    age : "uint8",
    isMale : "boolean",
    isDriver : "boolean"
};

//49 bytes
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
        micro.register("Car",carSchema,{serializeType:false});
        micro.register("Passenger",passengerSchema);

        console.log(JSON.stringify(carSchema));

        test.ok(micro.getSchema("Car"), "Car schema not found");
        test.ok(micro.getSchema("Passenger"), "Passenger schema not found");
    });

    test.done();
};



exports.testSerialize = function(test){

    test.doesNotThrow(function(){
        carBuffer = micro.toBinary(carData,"Car");
        test.equals(carBuffer.length, 39, "Car buffer has incorrect length");
    });

    test.done();
};

exports.testDeserialize = function(test){

    test.doesNotThrow(function(){
        newCarData = micro.toJSON(carBuffer,"Car");

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

    test.equals(passengers.length, passengers.length);

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
    carSchema.engine.byteLength = 1;

    test.doesNotThrow(function(){

        micro.register("Car", carSchema, {serializeType:false});

        carBuffer = micro.toBinary(carData,"Car");
        test.equals(carBuffer.length, 38, "Car buffer has incorrect length");

        newCarData = micro.toJSON(carBuffer, "Car");

        test.equals(Object.keys(newCarData.engine).length, 1, "Car Engine has incorrect number or keys");

    });

    test.done();
};