// microjs
// (c) 2010-2011 James Lynn <james.lynn@aristobotgames.com>, Aristobot LLC.

(function(definition) {
    if (typeof module != 'undefined') module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
    else this['micro'] = definition();
}(function() {

    /**
     * @param {number} [maxBufferLength] The maximum allowed serialized buffer length
     * @constructor
     */
    var MicroSerializer = function(maxBufferLength){
        this.maxBufferLength = maxBufferLength || 1024;
        this._schemaData = {};
        this._schemaNames = [];
    };

    /**
     * @param {object} schema The schema object that is being registered
     * @param {string | object} [name] The name of the schema being registered
     * @param {object} [params] Optional arguments
     * @param {boolean} [params.serializeType=true] Flag determining whether or not to serialize the typeId along with the data
     * @param {number} [params.maxBytes] Maximum size to allocate to a buffer, defaults to a best guess
     * @param {number} [params.typeId] A single byte integer used as a type identifier when serializing (defaults to the current number of serialized schemas)
     * @return {number} The typeId given to this schema
     */
    MicroSerializer.prototype.register = function(schema, name, params){

        if (typeof schema !== 'object'){
            throw new Error("schema '"+name+"' must be an object");
        }

        if (typeof name !== 'string'){
            //Assume this is an object of schemas
            for (var key in schema){
                if (schema.hasOwnProperty(key)){
                    this.register(schema[key], key, name);
                }
            }
        }
        else{
            try{

                params = params || {};
                params.serializeType = (typeof params.serializeType === 'boolean') ? params.serializeType : true;
                params.typeId = (typeof params.typeId == 'number') ? params.typeId : this._schemaNames.length;

                if (params.serializeType && (params.typeId%1 > 0 || params.typeId < 0 || params.typeId > 255)){
                    throw new Error("invalid typeId '"+params.typeId+"' (must be an integer between 0-255");
                }

                schema = parseSchema.call(this, schema);

                this._schemaData[name] = {
                    schema : schema,
                    serializeType:params.serializeType,
                    typeId : params.typeId,
                    size : params.maxBytes || calculateSchemaSize.call(this,schema)
                };

                if (params.serializeType){
                    this._schemaNames[params.typeId] = name;
                }

                return params.typeId;
            }
            catch (e){
                throw new Error("unable to parse schema '"+name+"' :"+ e.message);
            }

        }

    };

    function parseSchema(schema){

        var schemaArray = [], bitsProperty;

        for (var key in schema){
            if (schema.hasOwnProperty(key)){
                var property = parseProperty.call(this,schema[key]);
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

        return schemaArray;
    }

    function parseProperty(property){

        if (typeof property === 'string'){
            property = parsePropertyString.call(this,property);
        }
        else if (typeof property === 'object'){
            if (Array.isArray(property)){
                property = {type:'array', element:property[0]};
            }
            else{
                property = extend({},property);
                if (!property.type){
                    throw new Error("no 'type' specified for schema property");
                }
            }
        }
        else{
            throw new Error("schema property must be either string or object");
        }

        property.type = property.type.toLowerCase();

        switch (property.type){
            case 'int':
            case 'float':
                property.byteLength = parseInt(property.byteLength) || (property.type == 'int' ? 4 : 8);
                property.defaultValue = property.defaultValue || 0;
                property.unsigned = !!property.unsigned || false;

                if ([1,2,4,8].indexOf(property.byteLength) == -1){
                    throw new Error("invalid 'byteLength' of a number property (must be 1, 2, 4, or 8");
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
                property.large = Boolean(property.large);
                break;

            case 'array':
                if (!property.element){
                    throw new Error("must specify an 'element' attribute for a schema property of type: 'array'");
                }

                property.element = parseProperty.call(this,property.element);
                property.defaultValue = property.defaultValue || [];

                if (property.byteLength){

                    var numElements =  property.byteLength/(property.element.byteLength||1);

                    if (numElements%1 !== 0){
                        throw new Error("schema array byte length ("+property.byteLength+") is not a multiple of its element's byte length ("+property.element.byteLength+")");
                    }

                    property.maxLength = property.maxLength || numElements;
                }
                else{
                    property.maxLength = property.maxLength || this.maxBufferLength/(property.element.byteLength || 2);
                }

                //Create a dummy array schema (used for serializing and deserialzing)
                property.schema = [];
                for (var i = 0; i < property.maxLength; i++){
                    property.schema.push(extend({name:i},property.element));
                }

                property.large = Boolean(property.large);

                break;

            case 'object':

                if (typeof property.schema == 'object'){
                    property.schema = parseSchema.call(this,property.schema);
                }
                else if (typeof property.schema !== 'string'){
                    throw new Error("must specify a 'schema' attribute (of type string or object) for a schema property of type: 'object'");
                }
                else if (!this.getSchema(property.schema)){
                    throw new Error("Could not find a registered schema: '"+property.schema+'"');
                }


                property.defaultValue = property.defaultValue || null;
                property.allowNull =  Boolean(property.allowNull);

                if (property.allowNull && property.byteLength){
                    throw new Error("should not set 'allowNull' to true and add a specific 'byteLength' on a property of type 'object'")
                }

                break;

            case 'date':
                property.defaultValue = property.defaultValue || null;
                property.byteLength = 8;
                break;

            case 'enum' : {

                if (!property.values || !property.values.length){
                    throw new Error("must specify 'values' for property of type 'enum'");
                }

                property.defaultValue = property.defaultValue || null;
                property.byteLength = 1;

                if (property.values.indexOf(property.defaultValue) == -1){
                    property.values.push(property.defaultValue);
                }

                break;

            }

            default :
                throw new Error("invalid schema property type: '"+property.type+"'");

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
                return {type:'string', byteLength:1};

            default :
                return {type:value};
        }
    }

    function calculateSchemaSize(schema){
        var byteLength = 0;
        for (var i=0; i < schema.length; i++){
            var property = schema[i];
            if (property.byteLength){
                byteLength += property.byteLength;
            }else if (property.type === 'object'){
                byteLength += calculateSchemaSize.call(this, (typeof property.schema === 'object') ? property.schema : this.getSchema(property.schema));
            }else{
                byteLength += !property.large ? 256 : 65536;
            }

            if (byteLength >= this.maxBufferLength){
                return this.maxBufferLength;
            }
        }

        return byteLength;
    }

    /**
     * Returns the parsed schema object as an array of properties
     * @param {string} name
     * @returns {array}
     */
    MicroSerializer.prototype.getSchema = function(name){
        var schemaData = this._schemaData[name];
        return schemaData ? schemaData.schema : null;
    };

    /**
     * Serializes a JSON data object into a binary 'Buffer' instance
     * @param {object | string} json The JSON data object to be serialized
     * @param {string} schemaName  The name of the schema to use to convert this object
     * @param {number} [maxBytes] The maximum number of bytes to serialize (serializes the entire schema by default)
     * @returns {object} A binary Buffer Instance
     */
    MicroSerializer.prototype.toBinary = function(json, schemaName, maxBytes){

        if (typeof json === "string"){
            json = JSON.parse(json);
        }

        var schemaData = this._schemaData[schemaName];
        if (!schemaData){
            throw new Error("no schema with name: '"+schemaName+'" has been registered.')
        }

        maxBytes = maxBytes || schemaData.size;

        var buffer = writeToBuffer.call(this,schemaData.schema, json, maxBytes);

        if (buffer.length >= this.maxBufferLength){
            console.warn("Max Buffer Length reached ("+this.maxBufferLength+")! You may want to increase 'maxBufferLength' on this micro serializer instance. ")
        }

        if (schemaData.serializeType){
            buffer = Buffer.concat([new Buffer([schemaData.typeId]), buffer], buffer.length+1);
        }



        return buffer;
    };

    function writeToBuffer(schema, data, maxByteLength){

        data = data || {};
        maxByteLength = maxByteLength || this.maxBufferLength;

        var buffer = new Buffer(maxByteLength);
        var offset = 0;

        var length = schema.length;
        for (var i=0; i < length; i++){

            if (offset >= maxByteLength){
                break;
            }

            var property = schema[i],
                type = property.type,
                byteLength = property.byteLength,
                value = data[property.name] || property.defaultValue;
            try{
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
                        var arrayLen = names.length;
                        for (var j=0; j < arrayLen; j++){
                            var bool = data[names[j]];
                            bool = (typeof bool == "undefined") ? property.defaults[j] : !!bool;
                            value += bool ? 1 << arrayLen-1-j : 0;
                        }

                        buffer.writeUInt8(value, offset);
                        break;

                    case "string" :

                        if (!byteLength){
                            byteLength = Buffer.byteLength(value, property.encoding);

                            if (!property.large){
                                buffer.writeUInt8(byteLength, offset);
                                offset++;
                            }else{
                                buffer.writeUInt16BE(byteLength, offset);
                                offset+=2;
                            }
                        }

                        buffer.write(value, offset, byteLength, property.encoding);
                        break;

                    case "array":

                        var arraySchema = (value.length < property.schema.length)  ? property.schema.slice(0,value.length) : property.schema;
                        var arrayBuffer = writeToBuffer.call(this, arraySchema, value, byteLength);

                        if (!byteLength){
                            byteLength = arrayBuffer.length;

                            if (!property.large){
                                buffer.writeUInt8(arraySchema.length, offset);
                                offset++;
                            }else{
                                buffer.writeUInt16BE(arraySchema.length, offset);
                                offset+=2;
                            }
                        }

                        arrayBuffer.copy(buffer, offset);
                        break;

                    case "object":
                        property.schema = (typeof property.schema === 'object') ? property.schema : this.getSchema(property.schema);

                        if (property.allowNull){
                            if (value == null){
                                buffer.writeUInt8(1, offset);
                                byteLength = 1;
                                break;
                            }
                            else{
                                buffer.writeUInt8(0, offset);
                                offset++;
                            }
                        }

                        var objectBuffer = writeToBuffer.call(this, property.schema, value, byteLength);

                        byteLength = byteLength || objectBuffer.length;

                        objectBuffer.copy(buffer, offset);

                        break;

                    case "enum" :
                        var index = property.values.indexOf(value);
                        if (index == -1){
                            index = property.values.indexOf(property.defaultValue);
                        }

                        buffer.writeUInt8(index, offset);
                        break;

                    case "date" :

                        if (!value){
                            buffer.writeDoubleBE(0, offset);
                        }else{
                            var timestamp = new Date(value).getTime();


                            if (isNaN(timestamp)){
                                console.warn("Unable to parse date value '"+value+" for '"+property.name+"'. Setting to null.");
                                timestamp = 0;
                            }

                            buffer.writeDoubleBE(timestamp, offset);
                        }
                        break;

                    default :
                        throw new Error("unknown schema type: '"+type+"'");
                }
            }
            catch (e){
                throw new Error("while writing schema property '" +property.name+ "("+value+"): " +  e.message);
            }


            offset += byteLength;
        }

        if (offset < maxByteLength){
            buffer = buffer.slice(0, offset);
        }

        return buffer;
    }

    /**
     * Deserializes a binary 'Buffer' instance into a JSON data object
     * @param {object} buffer  The binary 'Buffer' instance containing the JSON data
     * @param {String} [schemaName] The name of the schema to use for conversion (not required as long as the binary data has a valid schema 'typeId' attached)
     * @returns {object} A JSON data object
     */
    MicroSerializer.prototype.toJSON = function(buffer, schemaName){

        var schemaData, json;

        if (schemaName){

            schemaData = this._schemaData[schemaName];

            if (!schemaData){
                throw new Error("could not find a registered schema with name: '"+schemaName+'"');
            }

            if (schemaData.serializeType){
                buffer = buffer.slice(1);
            }

            json = readFromBuffer.call(this, schemaData.schema, buffer);
        }
        else{
            schemaName = this._schemaNames[buffer[0]];

            if (!schemaName){
                throw new Error("could not derive a matching registered schema from the binary data");
            }

            schemaData = this._schemaData[schemaName];
            buffer = buffer.slice(1);

            json = readFromBuffer.call(this, schemaData.schema, buffer);
            json._type = schemaName;
        }

        return json;
    };

    function readFromBuffer(schema, buffer, data, wrap){

        data = data || {};

        var maxByteLength = buffer.length,
            offset = 0;

        var length = schema.length;
        for (var i=0; i < length; i++){

            if (offset >= maxByteLength){
                break;
            }

            var property = schema[i],
                type = property.type,
                byteLength = property.byteLength,
                value = undefined;

            try {
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
                        var arrayLen = names.length;
                        for (var j = 0; j < arrayLen; j++){
                            var bitValue =  1 << arrayLen-1-j;

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
                            if (!property.large){
                                byteLength = buffer.readUInt8(offset);
                                offset++;
                            }else{
                                byteLength = buffer.readUInt16BE(offset);
                                offset+=2;
                            }
                        }

                        value = buffer.toString(property.encoding, offset, offset+byteLength);

                        data[property.name] = value;

                        break;

                    case "array":
                        var arrayBuffer, arraySchema;

                        if (!byteLength){
                            var arrayLength;

                            if (!property.large){
                                arrayLength = buffer.readUInt8(offset);
                                offset++;
                            }else{
                                arrayLength = buffer.readUInt16BE(offset);
                                offset+=2;
                            }

                            arrayBuffer = buffer.slice(offset);
                            arraySchema = (arrayLength < property.schema.length)  ? property.schema.slice(0,arrayLength) : property.schema;

                        }else{
                            arrayBuffer = buffer.slice(offset, offset+byteLength);
                            arraySchema = property.schema;
                        }

                        value = readFromBuffer.call(this, arraySchema, arrayBuffer, [], true);
                        byteLength = value.byteLength;

                        data[property.name] = value.data;


                        break;

                    case "object":

                        if (property.allowNull){
                            if (buffer.readUInt8(offset) > 0){
                                data[property] = null;
                                byteLength = 1;
                                break;
                            }

                            offset++;
                        }

                        property.schema = (typeof property.schema === 'object') ? property.schema : this.getSchema(property.schema);



                        var objectBuffer = byteLength ? buffer.slice(offset, offset+byteLength) : buffer.slice(offset);
                        value = readFromBuffer.call(this, property.schema, objectBuffer, {}, true);
                        byteLength = value.byteLength;

                        data[property.name] = value.data;

                        break;

                    case "enum" :
                        var index = buffer.readUInt8(offset);
                        data[property.name] = property.values[index];
                        break;

                    case "date" :
                        value = buffer.readDoubleBE(offset);
                        data[property.name] = value > 0 ? new Date(value).toUTCString() : null;
                        break;

                    default :
                        throw new Error("unknown schema type: '"+type+"'");

                }
            }
            catch (e){
                throw new Error("while reading schema property '" +property.name+"':  "+ e.message)
            }

            offset += byteLength;
        }

        if (wrap){
            return {
                byteLength : offset,
                data : data
            }
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

    return new MicroSerializer();
}));




