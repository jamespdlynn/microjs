//If in browser, import the browser Buffer adapter
if (typeof window !== 'undefined' && !window.Buffer){
    require('../vendor/browser-buffer');
}

var MicroSerializer = function(maxBufferLength){
    this.maxBufferLength = maxBufferLength || 1024;
    this._schemaData = {};
    this._typeIndices = [];
};


MicroSerializer.prototype.register = function(name, schema, options){

    options = options || {};
    options.serializeType = (typeof options.serializeType === 'boolean') ? options.serializeType : true;
    options.typeIndex = (typeof options.typeIndex == 'number') ? options.index : this._typeIndices.length;

    this._schemaData[name] = {

        schema : parseSchema.call(this,schema),
        serializeType:options.serializeType,
        typeIndex : options.typeIndex
    };

    if (options.serializeType){
        this._typeIndices[options.typeIndex] = name;
    }
};

MicroSerializer.prototype.getSchema = function(name){
    var schemaData = this._schemaData[name];
    return schemaData ? schemaData.schema : null;
};

MicroSerializer.prototype.toBinary = function(json, schemaName, maxByteLength){

    var schemaData = this._schemaData[schemaName];
    if (!schemaData){
        throw new Error("No Schema with name: '"+schemaName+'" has been registered.')
    }

    var buffer = writeToBuffer.call(this,schemaData.schema, json, maxByteLength);

    if (schemaData.serializeType){
        buffer = Buffer.concat([new Buffer([schemaData.typeIndex]), buffer])
    }

    return buffer;
};

MicroSerializer.prototype.toJSON = function(buffer, schemaName){

    var schemaData;

    if (schemaName){

        schemaData = this._schemaData[schemaName];

        if (!schemaData){
            throw new Error("Could not find a registered schema with name: '"+schemaName+'"');
        }

        if (schemaData.serializeType){

            if (schemaData.typeIndex !== buffer[0]){
                throw new Error("Serialized type index derived from binary data ("+buffer[0]+") does not match that for '"+schemaName+"' ("+schemaData.typeIndex+")");
            }

            buffer = buffer.slice(1);
        }
    }
    else{
        schemaName = this._typeIndices[buffer[0]];

        if (!schemaName){
            throw new Error("Could not derive a matching registered schema from the binary data");
        }

        schemaData = this._schemaData[schemaName];
        buffer = buffer.slice(1);
    }

    var data = readFromBuffer.call(this, schemaData.schema, buffer);
    data._packet.type = schemaName;

    return data;
};


function parseSchema(schema){

    var schemaArray = [], bitsProperty;

    for (var key in schema){
        if (schema.hasOwnProperty(key)){
            var property = parseProperty(schema[key]);
            property.name = key;

            if (property.type === 'boolean'){
                if (!bitsProperty || bitsProperty.names.length >= 8){
                    bitsProperty = {type:'bits', names:[], defaults:[], byteLength:1, defaultValue:0};
                    schemaArray.push(bitsProperty);
                }

                bitsProperty.names.push(property.name);
                bitsProperty.defaults.push(property.defaultValue);
            }
            else{
                schemaArray.push(property);
            }

        }
    }

    if (!schemaArray.length){
        throw new Error("Schema must have attributes");
    }

    return schemaArray;
}



function parseProperty(property){

    if (typeof property === 'string'){
          property = parsePropertyString(property);
    }
    else if (typeof property === 'object'){
        if (Array.isArray(property)){
            property = {type:'array', element:property[0]};
        }
        else{
            property = extend({},property);
            if (!property.type){
                throw new Error("No type specified for schema attribute");
            }
        }
    }
    else{
        throw new Error("Schema property must be either string or object");
    }

    property.type = property.type.toLowerCase();

    switch (property.type){
        case 'int':
        case 'float':
            property.byteLength = parseInt(property.byteLength) || 4;
            property.defaultValue = property.defaultValue || 0;
            property.unsigned = !!property.unsigned || false;

            if ([1,2,4,8].indexOf(property.byteLength) == -1){
                throw new Error("Invalid bytesize of a schema property of type: '"+property.type+"' (must be 1, 2, 4, or 8");
            }

            break;

        case 'boolean':
        case 'bit':
            property.type = 'boolean';
            property.defaultValue = !!property.defaultValue;
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
            property.schema = [];  //Create a dummy array schema (used for serializing and deserialzing)

            if (property.byteLength && property.element.byteLength){

                var numElements =  property.byteLength/property.element.byteLength;

                if (numElements%1 !== 0){
                    throw new Error("Schema array byte length ("+property.byteLength+") is not a multiple of its element's byte length ("+property.element.byteLength+")");
                }

                for (var i = 0; i < numElements; i++){
                    property.schema.push(extend({name:i},property.element));
                }
            }

            break;

        case 'object':

            if (typeof property.schema == 'object'){
                property.schema = parseSchema.call(this,property.schema);
            }
            else if (typeof property.schema !== 'string'){
                throw new Error("Must specify a 'schema' attribute (of type string or object) for a schema property of type: 'object'");
            }

            property.defaultValue = property.defaultValue || {};
            break;

        default :
            throw new Error("Invalid schema property type: '"+property.type+"'");

    }

    return property;
}

function parsePropertyString(value){

    value = value.toLowerCase();

    switch (value){
        case 'int8':
        case 'byte':
            return {type:'int', byteLength:1};

        case 'uint8':
        case 'ubyte':
            return {type:'int', byteLength:1, unsigned:true};

        case 'int16':
        case 'short':
            return {type:'int', byteLength:2};

        case 'uint16':
        case 'ushort':    
            return {type:'int', byteLength:2, unsigned:true};

        case 'int32':
        case 'int':
            return {type:'int', byteLength:4};

        case 'uint32':
        case 'uint':
            return {type:'int', byteLength:4, unsigned:true};

        case 'int64':
        case 'long':
            return {type:'int', byteLength:8};

        case 'float8':
            return {type:'float', byteLength:1, precision:1};

        case 'ufloat8':
            return {type:'float', byteLength:1, unsigned:true, precision:1};

        case 'float16':
            return {type:'float', byteLength:2, precision:1};

        case 'ufloat16':
            return {type:'float', byteLength:2, unsigned:true, precision:1};

        case 'float32':
        case 'float':
            return {type:'float', byteLength:4, precision:2};

        case 'ufloat32':
        case 'ufloat':
            return {type:'float', byteLength:4, unsigned:true, precision:2};

        case 'float64':
        case 'double':
            return {type:'float', byteLength:8};

        case 'char':
            return {type:'string', byteLength:1, encoding:'utf8'};

        default :
            return {type:value};
    }
}


function writeToBuffer(schema, data, maxByteLength){

    maxByteLength = maxByteLength || this.maxBufferLength;

    var buffer = new Buffer(maxByteLength);
    var offset = 0;

    for (var i=0; i < schema.length; i++){


        if (offset >= maxByteLength){
            break;
        }

        var property = schema[i],
            type = property.type,
            byteLength = property.byteLength,
            value = data[property.name] || property.defaultValue;

        switch (type){

            case "int" :
            case "float" :

                if (type == "int"){
                    value = Math.round(value);
                }
                else if (property.precision){
                    value *= (Math.pow(10,property.precision));
                    value = Math.round(value);
                }

                switch (byteLength){
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

                break;

            case "bits" :
                var names = property.names;

                for (var j=0; j < names.length; j++){
                     var bool = data[names[j]];
                     bool = (typeof bool == "undefined") ? property.defaults[j] : !!bool;
                     value += bool ? 1 << names.length-1-j : 0;
                }

                buffer.writeUInt8(value, offset);
                break;

            case "string" :

                if (!byteLength){
                    byteLength = Buffer.byteLength(value, property.encoding);
                    buffer.writeUInt8(byteLength, offset);
                    offset++;
                }

                buffer.write(value, offset, byteLength, property.encoding);
                break;

            case "array":

                var arraySchema = property.schema;

                if (value.length > arraySchema.length){
                    for (var k=arraySchema.length; k < value.length;k++){
                        arraySchema.push(extend({name:k},property.element));
                    }
                }
                else if (value.length < arraySchema.length){
                    arraySchema = arraySchema.slice(0,value.length);
                }

                var arrayBuffer = writeToBuffer.call(this, arraySchema, value, byteLength);

                if (!byteLength){
                   byteLength = arrayBuffer.length;
                   buffer.writeUInt8(byteLength, offset);
                   offset++;
                }

                arrayBuffer.copy(buffer, offset);
                break;

            case "object":
                property.schema = (typeof property.schema === 'object') ? property.schema : this.getSchema(property.schema);

                if (! property.schema){
                    throw new Error("Object schema: '"+property.schema + "' has not been registered.");
                }

                var objectBuffer = writeToBuffer.call(this, property.schema, value, byteLength);

                byteLength = byteLength || objectBuffer.length;

                objectBuffer.copy(buffer, offset);
                break;

            default :
                throw new Error("Unknown schema type: '"+type+"'");
        }

        offset += byteLength;
    }

    if (offset < maxByteLength){
        buffer = buffer.slice(0, offset);
    }

    return buffer;
}

function readFromBuffer(schema, buffer, data){

    data = data || {_packet:{}};

    var maxByteLength = buffer.length,
        offset = 0;

    for (var i=0; i < schema.length; i++){

        if (offset >= maxByteLength){
            break;
        }

        var property = schema[i],
            type = property.type,
            byteLength = property.byteLength,
            value = undefined;

        switch (type){

            case "int" :
            case "float":

                switch (byteLength){
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


                if (type == "float" && property.precision){
                    value /= (Math.pow(10,property.precision));
                }

                data[property.name] = value;

                break;

            case "bits" :
                value = buffer.readUInt8(offset);

                var names = property.names;
                for (var j = 0; j < property.names.length; j++){
                    var bitValue =  1 << names.length-1-j;

                    if(value >= bitValue){
                        data[names[j]] = true;
                        value -= bitValue;
                    }else{
                        data[names[j]] = false;
                    }

                }

                break;

            case "string" :

                if (!byteLength){
                    byteLength = buffer.readUInt8(offset);
                    offset++;
                }

                value = buffer.toString(property.encoding, offset, offset+byteLength);

                data[property.name] = value;

                break;

            case "array":
                if (!byteLength){
                    byteLength = buffer.readUInt8(offset);
                    offset++;
                }

                var arrayBuffer = buffer.slice(offset, offset+byteLength);
                value = readFromBuffer.call(this, property.schema, arrayBuffer, []);

                data[property.name] = value;

                break;

            case "object":

                property.schema = (typeof property.schema === 'object') ? property.schema : this.getSchema(property.schema);
                if (!property.schema){
                    throw new Error("Object schema: '"+property.schema + "' has not been registered.");
                }

                var objectBuffer = byteLength ? buffer.slice(offset, offset+byteLength) : buffer.slice(offset);

                value = readFromBuffer.call(this, property.schema, objectBuffer);

                if (!byteLength){
                    byteLength = value._packet.byteLength;
                }

                delete value._packet;
                data[property.name] = value;

                break;

        }

        offset += byteLength;
    }

    if (data._packet){
        data._packet.byteLength = offset;
    }

    return data;
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
