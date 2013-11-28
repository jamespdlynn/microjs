if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function(require){

    if (!Buffer){
        require ('./vendor/browser-buffer');
    }

        var TYPES = {
            int8 : 1,
            byte : 1,
            int16 : 2,
            short : 2,
            int32 : 4,
            int : 4,
            float8 : 1,
            float16 : 2,
            float32 : 4,
            float : 4,
            double : 8
        };

        var MicroSerializer = function(){
            this._schemas = [];
            this._indexMap = {};
        };

        MicroSerializer.prototype.register = function(name, schema){

            for (var key in schema){
                if (schema.hasOwnProperty(key)){

                    if (typeof schema[key] === 'string'){
                        schema[key] = {type:schema[key]};
                    }

                    var property = schema[key];

                    if (typeof property.type !== 'string'){
                        throw new Error("Invalid type for schema attribute: '"+key+"'.");
                    }

                    if (property.type.charAt(0) === 'u'){
                        property.type = property.type.substring(1);
                        property.unsigned = true;
                    }

                    if (!TYPES.hasOwnProperty(property.type)){
                        throw new Error("Invalid type for schema attribute: '"+key+"'.");
                    }

                    property.default = property.default || 0;
                    property.precision = property.precision || 1;
                    property.size = TYPES[property.type];
                }
            }

            if (!this._indexMap[name]){
                this._indexMap[name] = this._schemas.length;
            }

            this._schemas[this._indexMap[name]] = schema;
        };

        MicroSerializer.prototype.getSchema = function(name){
            return this._schemas[this._indexMap[name]];
        };



        MicroSerializer.prototype.serialize = function(name, data, options){

            options = options || {};
            options.serializeDataType = (options.serializeDataType !== undefined) ? Boolean(options.serializeDataType) : true;

            var schemaIndex = this._indexMap[name];
            var schema = this._schemas[schemaIndex];

            if (!schema){
                throw new Error("No Schema with name: '"+name+'" has been registered.')
            }

            var key, numKeys= 0;

            for (key in data){
                //Set previous data defaults
                if (data.hasOwnProperty(key)){
                    if (schema.hasOwnProperty(key)){
                        numKeys++;
                    }else{
                        console.warn("Schema does not have any property: '"+key+"'. Value will not be serialized");
                    }
                }
            }

            var attributes = [],
                bufferSize = 1,
                i = 0;

            for (key in schema){

                if (i >= numKeys){
                    break;
                }

                if (schema.hasOwnProperty(key)){
                    var property = schema[key],
                        value = property.default;

                    if (data.hasOwnProperty(key)){
                        value = data[key];
                        i++;
                    }

                    attributes.push({
                        property: property,
                        value : value
                    });

                    bufferSize += property.size;
                }
            }

            var buffer = new Buffer(bufferSize),
                offset = 0;

            if (options.serializeDataType){
                buffer.writeUInt8(schemaIndex, 0);
                offset++;
            }


            attributes.forEach(function(attribute){
                writeToBuffer(buffer, attribute.property, offset, attribute.value);
                offset += attribute.property.size;
            });

            return buffer;

        };

        MicroSerializer.prototype.deserialize = function(buffer, options){

            options = options || {};

            var schemaName = options.dataType || null,
                offset = 0;

            if (!schemaName){
                var schemaIndex = buffer.readUInt8(offset);

                if (schemaIndex >= this._schemas.length){
                    throw new Error("Buffer has invalid schema index");
                }

                schemaName = Object.keys(this._indexMap)[schemaIndex];
                offset++;
            }

            var schema = this._schemas[this._indexMap[schemaName]],
                data = {_type : schemaName},
                key;


            for (key in schema){

                if (offset >= buffer.length){
                    break;
                }

                if (schema.hasOwnProperty(key)){
                    var property = schema[key];
                    data[key] = readFromBuffer(buffer,property,offset);

                    offset += property.size;
                }
            }

            return data;
        };



    function readFromBuffer(buffer,property,offset){

        var value;

        switch (property.type){

            case "int8":
            case "byte":
                value =  property.unsigned ? buffer.readUInt8(offset) : buffer.readInt8(offset);
                break;

            case "int16":
            case "short":
                value =  property.unsigned ? buffer.readUInt16BE(offset) : buffer.readInt16BE(offset);
                break;

            case "int32":
            case "int":
                value = property.unsigned ? buffer.readUInt32BE(offset) : buffer.readInt32BE(offset);
                break;

            case "float8":
                value = property.unsigned ? buffer.readUInt8(offset) : buffer.readInt8(offset);
                value /= (Math.pow(10,property.precision));
                break;

            case "float16":
                value = property.unsigned ? buffer.readUInt16BE(offset) : buffer.readInt16BE(offset);
                value /= (Math.pow(10,property.precision));
                break;

            case "float32":
            case "float":
                value = property.unsigned ? buffer.readUInt32BE(offset) : buffer.readInt32BE(offset);
                value /= (Math.pow(10,property.precision));
                break;

            case "float64":
            case "double":
                value =  buffer.readDoubleBE(offset);
                break;

            default :
                throw new Error("Invalid type for schema attribute: '"+property.type+"'.");

        }


        return value;

    }

    function writeToBuffer(buffer,property,offset,value){



        switch (property.type){

            case "int8":
            case "byte":
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt8(value, offset) : buffer.writeInt8(value,offset);
                break;

            case "int16":
            case "short":
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt16BE(value, offset) : buffer.writeInt16BE(value,offset);
                break;

            case "int32":
            case "int":
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt32BE(value, offset) : buffer.writeInt32BE(value,offset);
                break;

            case "float8":
                value *= (Math.pow(10,property.precision));
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt8(value, offset) : buffer.writeInt8(value,offset);
                break;

            case "float16":
                value *= (Math.pow(10,property.precision));
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt16BE(value, offset) : buffer.writeInt16BE(value,offset);
                break;

            case "float32":
            case "float":
                value *= (Math.pow(10,property.precision));
                value = Math.round(value);
                property.unsigned ? buffer.writeUInt32BE(value, offset) : buffer.writeInt32BE(value,offset);
                break;

            case "float64":
            case "double":
                buffer.writeDoubleBE(value, offset);
                break;

            default :
                throw new Error("Invalid type for schema attribute: '"+property.type+"'.");

        }

    }


    return new MicroSerializer();
});







