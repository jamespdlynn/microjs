//If in browser, import the browser Buffer adapter
if (typeof window !== 'undefined' && !window.Buffer){
    require('../vendor/browser-buffer');
}

var extend = require('util')._extend;

var MicroSerializer = function(){
    this._schemas = [];
    this._indexMap = {};
};


MicroSerializer.prototype.register = function(name, schema, index){

    /*var maxSchemas = Math.pow(2,schemaBits);

    if (this._schemas.length >= maxSchemas){
        throw new Error("Maximum number of allowed schemas ("+maxSchemas+") reached. To allow for more schemas, try increasing MicroSerializer's 'schemaBits' property");
    }    */

    if (this._indexMap.hasOwnProperty(name)){
        var oldIndex = this._indexMap[name];
        this._schemas[oldIndex] = undefined;
        delete this._indexMap[name];
    }

    index = index || this._schemas.length;
    this._indexMap[name] = index;
    this._schemas[index] = parseSchema.call(this,schema);
};

MicroSerializer.prototype.getSchema = function(name){
    return this._schemas[this._indexMap[name]];
};

MicroSerializer.prototype.serialize = function(name, data, maxByteLength){

    var schemaIndex = this._indexMap[name],
        schema = this._schemas[schemaIndex];

    if (!schema){
        throw new Error("No Schema with name: '"+name+'" has been registered.')
    }

    var buffer = writeToBuffer(schema, data, maxByteLength);
    return Buffer.concat([new Buffer([schemaIndex]), buffer]);
};

MicroSerializer.prototype.deserialize = function(buffer){

    var schemaIndex = buffer.readUInt8(0),
        schema = this._schemas[schemaIndex],
        schemaName = Object.keys(this._indexMap)[schemaIndex];

    var data = parseSchemaFromBuffer.call(this, buffer, schema, 1).value;
    data._type = schemaName;

    return data;
};


function parseSchema(schema){

    var schemaArray = [];

    for (var key in schema){
        if (schema.hasOwnProperty(key)){
            var property = parseProperty(schema[key]);
            property.name = key;
            schemaArray.push(property);
        }
    }

    if (!schemaArray.length){
        throw new Error("Schema must have attributes");
    }

    return schemaArray;
}

function parseProperty(property){


    if (typeof property === 'string'){

        switch (property){
            case 'int8':
            case 'byte':
                property = {type:'int', byteLength:1};
                break;

            case 'uint8':
                property = {type:'int', byteLength:1, unsigned:true};
                break;

            case 'int16':
            case 'short':
                property = {type:'int', byteLength:2};
                break;

            case 'uint16':
                property = {type:'int', byteLength:2, unsigned:true};
                break;

            case 'int32':
            case 'int':
                property = {type:'int', byteLength:4};
                break;

            case 'uint32':
            case 'uint':
                property = {type:'int', byteLength:4, unsigned:true};
                break;

            case 'int64':
            case 'long':
                property = {type:'int', byteLength:8};
                break;

            case 'float8':
                property = {type:'float', byteLength:1, precision:1};
                break;

            case 'ufloat8':
                property = {type:'int', byteLength:1, unsigned:true, precision:1};
                break;

            case 'float16':
                property = {type:'float', byteLength:2, precision:1};
                break;

            case 'ufloat16':
                property = {type:'int', byteLength:2, unsigned:true, precision:1};
                break;

            case 'float32':
            case 'float':
                property = {type:'float', byteLength:4, precision:2};
                break;

            case 'ufloat32':
            case 'ufloat':
                property = {type:'int', byteLength:4, unsigned:true, precision:2};
                break;

            case 'number':
            case 'float64':
            case 'double':
                property = {type:'float', byteLength:8};
                break;

            case 'char':
                property = {type:'string', byteLength:1, encoding:'utf8'};
                break;

            default :
                property = {type:property};
        }
    }
    else if (Array.isArray(property)){
        if (!property.length) property[0] = null;
        property = {type:'array', element:property[0]};
    }

    switch (property.type){
        case 'int':
        case 'float':
            property.byteLength = property.byteLength || 4;
            property.defaultValue = property.defaultValue || 0;
            property.unsigned = !!property.unsigned || false;

            if ([1,2,4,8].indexOf(property.byteLength) == -1){
                throw new Error("Invalid bytesize of a schema property of type: '"+property.type+"' (must be 1, 2, 4, or 8");
            }

            break;

        case 'string':
            property.encoding = property.encoding || 'utf8';
            property.defaultValue = property.defaultValue || "";
            break;

        case 'array':
            if (!property.element){
                throw new Error("Must specify an 'element' attribute for a schema property of type: 'array'");
            }

            property.element = parseProperty(property.element);
            property.defaultValue = property.defaultValue || [];

            if (!property.arrayLength && property.byteLength){

                if (property.element.byteLength){
                    property.arrayLength = Math.floor(property.byteLength/property.element.byteLength);
                }

                if (!property.arrayLength){
                    throw new Error("Could not calculate arrays default length given from the 'byteLength' attributes, please specify an 'arrayLength' attribute instead");
                }
            }
            break;

        case 'object':
            if (!property.schema){
                throw new Error("Must specify a 'schema' attribute for a schema property of type: 'object'");
            }
            property.defaultValue = property.defaultValue || {};
            break;

        default :
            throw new Error("Invalid schema property type: '"+property.type+"'");

    }

    return property;
}


function writeToBuffer(schema, data, maxByteLength){

    maxByteLength = maxByteLength || 1024;

    var buffer = new Buffer(maxByteLength),
        offset = 0;

    for (var i=0; i < schema.length; i++){

        if (offset >= maxByteLength){
            break;
        }

        var property = schema[i],
            value = data[property.name] || property.defaultValue;

        switch (property.type){

            case "int" :
            case "float" :

                if (property.type == "int"){
                    value = Math.round(value);
                }
                else if (property.precision){
                    value *= (Math.pow(10,property.precision));
                    value = Math.round(value);
                }

                switch (property.byteLength){
                    case 1:
                        property.unsigned ? buffer.writeUInt8(value, offset) : buffer.writeInt8(value,offset);
                        break;

                    case  2:
                        property.unsigned ? buffer.writeUInt16BE(value, offset) : buffer.writeInt16BE(value,offset);
                        break;

                    case 4:
                        property.unsigned ? buffer.writeUInt32BE(value, offset) : buffer.writeInt32BE(value,offset);
                        break;

                    case 8:
                        buffer.writeDoubleBE(value, offset);
                        break;
                }

                offset += property.byteLength;
                break;

            case "string" :
                var byteLength = property.byteLength;

                if (!byteLength){
                    byteLength = Buffer.byteLength(value, property.encoding);
                    buffer.writeUInt8(byteLength, offset);
                    offset++;
                }

                buffer.write(value, offset, byteLength, property.encoding);
                offset += byteLength;
                break;

            case "array":
                var arraySchema = [];
                for (var j=0; j < value.length; j++){
                    arraySchema.push({name:j},property.element);
                }

                var arrayBuffer = writeToBuffer.call(this, arraySchema, value, property.byteLength);

                if (!property.byteLength){
                   buffer.writeUInt8(property.byteLength);
                   offset++;
                }
                arrayBuffer.copy(buffer, offset);
                offset += property.byteLength || arrayBuffer.length;
                break;

            case "object":
                var objectSchema = this.getSchema(property.schema);
                if (!objectSchema){
                    throw new Error("Object schema: '"+property.schema + "' has not been registered.");
                }

                var objectBuffer = writeToBuffer.call(this, objectSchema, value, property.byteLength);
                objectBuffer.copy(buffer, offset);
                offset += property.byteLength || objectBuffer.length;
                break;
        }
    }


    if (offset < maxByteLength){
        buffer = buffer.slice(0, offset);
    }


    return buffer;
}

function parseSchemaFromBuffer(buffer, schema, offset, maxByteLength){
    offset = offset || 0;
    maxByteLength = maxByteLength || buffer.length-offset;

    var value = {}, currentByteLength = 0;

    for (var i=0; i < schema.length; i++){
         if (currentByteLength >= maxByteLength){
             break;
         }

         var property = schema[i],
             dataObject = parsePropertyFromBuffer.call(this, buffer, property, offset+currentByteLength);

        currentByteLength += dataObject.byteLength;

        if (currentByteLength <= maxByteLength){

            value[property.name] = dataObject.value;
        }
        else{
            break;
        }

    }

    return {value:value, byteLength:Math.min(currentByteLength,maxByteLength)};
}

function parsePropertyFromBuffer(buffer, property, offset){

    offset = offset || 0;

    var value, byteLength = 0;


    switch (property.type){

        case "int" :
        case "float":

            switch (property.byteLength){
                case 1:
                    value = property.unsigned ? buffer.readUInt8(offset) : buffer.readInt8(offset);
                    break;

                case  2:
                    value = property.unsigned ? buffer.readUInt16BE(offset) : buffer.readInt16BE(offset);
                    break;

                case 4:
                    value = property.unsigned ? buffer.readUInt32BE(offset) : buffer.readInt32BE(offset);
                    break;

                case 8:
                    value = buffer.readDoubleBE(offset);
                    break;
            }


            if (property.type == "float" && property.precision){
               value /= (Math.pow(10,property.precision));
            }

            byteLength = property.byteLength;
            break;

        case "string" :

            var stringByteLength = property.byteLength;

            if (!stringByteLength){
                stringByteLength = buffer.readUInt8(offset);
                byteLength++;
                offset++;
            }

            value = buffer.toString(property.encoding, offset, offset+stringByteLength);
            byteLength+=stringByteLength;

            break;

        case "array":
            value = [];

            var arrayLength = property.arrayLength;
            if (!arrayLength){
                arrayLength =  buffer.readUInt8(offset);
                byteLength++;
            }

            for (var i=0; i < arrayLength; i++){
                var elementDataObject = parsePropertyFromBuffer.call(this, buffer, offset+byteLength);
                byteLength += elementDataObject.byteLength;
                value.push.apply(value, elementDataObject.value);
            }

            break;

        case "object":
            var schema = this.getSchema(property.schema);

            if (!schema){
                throw new Error("Object schema: '"+property.schema + "' has not been registered.");
            }

            return parseSchemaFromBuffer.call(this, buffer, schema, offset, property.byteLength);
    }

    return {value:value, byteLength:byteLength};
}

function extend(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || typeof add !== 'object') return origin;

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
        origin[keys[i]] = add[keys[i]];
    }
    return origin;
}


module.exports = new MicroSerializer();
