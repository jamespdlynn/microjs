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

MicroSerializer.prototype.getSchema = function(schemaName){
    var schemaData = this._schemaData[schemaName];
    return schemaData ? schemaData.schema : null;
};

MicroSerializer.prototype.serialize = function(schemaName, data, maxByteLength){

    var schemaData = this._schemaData[schemaName];
    if (!schemaData){
        throw new Error("No Schema with name: '"+schemaName+'" has been registered.')
    }

    var buffer = writeToBuffer.call(this,schemaData.schema, data, maxByteLength);

    if (schemaData.serializeType){
        buffer = Buffer.concat([new Buffer([schemaData.typeIndex]), buffer])
    }

    return buffer;
};

MicroSerializer.prototype.deserialize = function(buffer, schemaName){

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

        property = property.toLowerCase();

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
                property = {type:'float', byteLength:1, unsigned:true, precision:1};
                break;

            case 'float16':
                property = {type:'float', byteLength:2, precision:1};
                break;

            case 'ufloat16':
                property = {type:'float', byteLength:2, unsigned:true, precision:1};
                break;

            case 'float32':
            case 'float':
                property = {type:'float', byteLength:4, precision:2};
                break;

            case 'ufloat32':
            case 'ufloat':
                property = {type:'float', byteLength:4, unsigned:true, precision:2};
                break;

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
        property = {type:'array', element:property[0]};
    }
    else{
        if (!property.type){
            throw new Error("No type specified for schema attribute");
        }
        property.type = property.type.toLowerCase();
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
            if (property.byteLength){
                if (property.element.byteLength){

                    property.maxElements= property.byteLength/property.element.byteLength;

                    if (property.maxElements%1 !== 0){
                        throw new Error("Schema array byte length ("+property.byteLength+") is not a multiple of its element's byte length ("+property.element.byteLength+")");
                    }
                }
                else{
                    property.maxElements = property.byteLength;
                }
            }else{
                property.maxElements = property.maxElements || 128;
            }

            //Create a dummy array schema (used for serializing and deserialzing)
            property.schema = [];
            for (var i = 0; i < property.maxElements; i++){
               property.schema.push({name:i},property.element);
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

    maxByteLength = maxByteLength || this.maxBufferLength;

    var buffer = new Buffer(maxByteLength),
        offset = 0;

    for (var i=0; i < schema.length; i++){

        if (offset >= maxByteLength){
            break;
        }

        var property = schema[i],
            type = property.type,
            byteLength = property.byteLength,
            value = data[property.name] || property.defaultValue

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

            case "string" :

                if (!byteLength){
                    byteLength = Buffer.byteLength(value, property.encoding);
                    buffer.writeUInt8(byteLength, offset);
                    offset++;
                }

                buffer.write(value, offset, byteLength, property.encoding);
                break;

            case "array":

                var arraySchema = value.length < property.maxElements ? property.schema.slice(0, value.length) : property.schema,
                    arrayBuffer = writeToBuffer.call(this, arraySchema, value, byteLength);

                if (!byteLength){
                   byteLength = arrayBuffer.length;
                   buffer.writeUInt8(byteLength);
                   offset++;
                }

                arrayBuffer.copy(buffer, offset);
                break;

            case "object":
                var objectSchema = this.getSchema(property.schema);
                if (!objectSchema){
                    throw new Error("Object schema: '"+property.schema + "' has not been registered.");
                }

                var objectBuffer = writeToBuffer.call(this, objectSchema, value, byteLength);

                if (!byteLength){
                    byteLength = objectBuffer.length;
                }

                objectBuffer.copy(buffer, offset);
                break;
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

    console.log("Buffer :"+buffer.toJSON());

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
                break;

            case "string" :

                if (!byteLength){
                    byteLength = buffer.readUInt8(offset);
                    offset++;
                }

                value = buffer.toString(property.encoding, offset, offset+byteLength);

                break;

            case "array":
                if (!byteLength){
                    byteLength =  buffer.readUInt8(offset);
                    offset++;
                }

                var arrayBuffer = buffer.slice(offset, offset+byteLength);
                value = readFromBuffer.call(this, property.schema, arrayBuffer, []);

                break;

            case "object":
                var objectSchema = this.getSchema(property.schema);

                if (!objectSchema){
                    throw new Error("Object schema: '"+property.schema + "' has not been registered.");
                }

                var objectBuffer = buffer.slice(offset, byteLength);
                value = readFromBuffer.call(this, property.schema, objectBuffer);

                if (!byteLength){
                    byteLength = value._packet.byteLength;
                }

                break;

        }

        data[property.name] = value;
        offset += byteLength;
    }

    if (data._packet){
        data._packet.byteLength = offset;
    }

    return data;
}

function parsePropertyFromBuffer(buffer, property, offset){

    offset = offset || 0;

    var value, byteLength = 0;

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
