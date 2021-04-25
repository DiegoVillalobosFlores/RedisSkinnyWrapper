import Hash from './hash';
import SortedSet from './sortedSet';

const formatKey = (key, withPostFix, dataStructure) => (withPostFix ? `${key}${dataStructure.getPostFix()}` : key);

const getObjectKey = (key, field) => `${key}:${field.toUpperCase()}`;

const getArrayKey = (key, field, index) => `${key}:${field.toUpperCase()}${index !== undefined && index !== null ? `:${index}` : ''}`;

const validateSchema = (schema) => schema !== undefined && schema !== null;

export default class Automatic {
  constructor(redis, schema, withPostFix) {
    this.redis = redis;
    this.schema = schema;

    const hash = new Hash(redis);
    const sortedSet = new SortedSet(redis);

    this.conversionFunctions = {
      int: (value) => parseInt(value, 10),
      string: (value) => value,
      float: (value) => parseFloat(value),
      boolean: (value) => value === 'true',
    };

    this.schemaMapGet = {
      hash: (key, fields) => hash.get(formatKey(key, withPostFix, hash), fields),
      arrayWeighted: (key) => sortedSet.range(formatKey(key, withPostFix, sortedSet), true),
      array: (key) => sortedSet.range(
        formatKey(key, withPostFix, sortedSet),
      ),
    };

    this.schemaMapSet = {
      int:
        (key, field, value) => hash.add(formatKey(key, withPostFix, hash), { [field]: value }),
      float:
        (key, field, value) => hash.add(formatKey(key, withPostFix, hash), { [field]: value }),
      string:
        (key, field, value) => hash.add(formatKey(key, withPostFix, hash), { [field]: value }),
      boolean:
        (key, field, value) => hash.add(formatKey(key, withPostFix, hash), { [field]: value }),
      arrayWeighted:
        (key, field, value) => value.map(
          ({ value: elementValue, score }) => sortedSet.add(
            formatKey(getArrayKey(key, field), withPostFix, sortedSet),
            elementValue,
            score,
          ),
        ),
      array:
        (key, field, value) => value.map(
          (arrayElement, index) => sortedSet.add(
            formatKey(getArrayKey(key, field), withPostFix, sortedSet),
            arrayElement,
            index,
          ),
        ),
    };
  }

  generateSchema(values) {
    const entries = Object.entries(values);

    const newSchema = {};

    for (let i = 0; i < entries.length; i += 1) {
      const [field, value] = entries[i];
      switch (typeof value) {
        case 'undefined':
          throw new Error(`Invalid Field: ${field}`);
        case 'string':
          newSchema[field] = 'string';
          break;
        case 'number':
          if (Number.isSafeInteger(value)) newSchema[field] = 'int';
          else newSchema[field] = 'float';
          break;
        case 'boolean':
          newSchema[field] = 'boolean';
          break;
        case 'object':
          if (Array.isArray(value)) {
            if (value.every(
              ({ value: element, score }) => typeof element === 'string' && typeof score === 'number',
            )
            ) newSchema[field] = 'arrayWeighted';
            else if (value.every(
              (element) => typeof element === 'string' || typeof element === 'number',
            )
            ) newSchema[field] = 'array';
            else if (value.every(
              (element) => typeof element === 'object' && element.constructor.name === 'Object',
            )) {
              newSchema[field] = value.map((arrayElement) => this.generateSchema(arrayElement));
            } else throw new Error(`Currently only arrays of strings, numbers, {value,score} and objects are supported for field: ${field}`);
            break;
          }
          if (Object.keys(value).length === 0) throw new Error(`Empty objects are not currently supported for field: ${field}`);
          newSchema[field] = this.generateSchema(value);
          break;
        default:
          throw new Error(`Invalid value type for field: ${field}, ${typeof value}`);
      }
    }

    return newSchema;
  }

  setSchema(schema) {
    if (!validateSchema(schema)) throw new Error('Invalid Schema');
    this.schema = schema;
    return schema;
  }

  getSchema() {
    return this.schema;
  }

  saveObject(key, values, schema) {
    const entries = Object.entries(values);

    let promises = [];
    for (let i = 0; i < entries.length; i += 1) {
      const [field, value] = entries[i];

      const type = schema[field];
      const actualType = typeof value;
      if (!type) throw new Error(`Field ${field} is not in the schema or its type is different, expected: ${this.schema[field]}, got: ${actualType}`);

      if (typeof type === 'object') {
        if (Array.isArray(value)) {
          promises = [...promises, ...value.reduce(
            (acc, arrayElement, index) => [
              ...acc,
              ...this.saveObject(
                getArrayKey(key, field, index),
                arrayElement,
                schema[field][index],
              )], [],
          ),
          ];
        } else {
          promises = [
            ...promises,
            ...this.saveObject(getObjectKey(key, field), value, schema[field]),
          ];
        }
      } else {
        const setter = this.schemaMapSet[type](key, field, value);
        if (Array.isArray(setter)) promises = [...promises, ...setter];
        else promises.push(setter);
      }
    }

    return promises;
  }

  async getObject(key, schema) {
    let result = {};

    const values = Object.entries(schema);

    const hashValues = ['string', 'int', 'float', 'boolean'];
    const arrayValues = ['array', 'arrayWeighted'];

    const hashFields = [];
    for (let i = 0; i < values.length; i += 1) {
      const [field, value] = values[i];

      if (hashValues.includes(schema[field])) {
        hashFields.push(field);
      } else if (arrayValues.includes(schema[field])) {
        const arrayKey = getArrayKey(key, field);
        result[field] = await this.schemaMapGet[value](arrayKey);
      } else if (Array.isArray(schema[field])) {
        result[field] = await Promise.all(value.map(
          (arrayElement, index) => this.getObject(getArrayKey(key, field, index), arrayElement),
        ));
      } else if (typeof schema[field] === 'object') {
        const objectKey = getObjectKey(key, field);
        result[field] = await this.getObject(objectKey, value);
      }
    }

    if (hashFields.length > 0) {
      const hashResult = await this.schemaMapGet.hash(key, hashFields);
      result = {
        ...result,
        ...hashFields.reduce(
          (acc, hashField, index) => (
            {
              ...acc,
              [hashField]: this.conversionFunctions[schema[hashField]](hashResult[index]),
            }), {},
        ),
      };
    }

    return result;
  }

  async add(key, values) {
    if (typeof values !== 'object') throw new Error(`The second parameter "value" must be of type "object", got: ${typeof values}`);

    if (!this.schema) this.schema = this.generateSchema(values);

    return Promise.all([...this.saveObject(key, values, this.schema)]);
  }

  async get(key) {
    if (!this.schema) throw new Error('No Schema defined, first define a schema before trying to get any value');

    return this.getObject(key, this.schema);
  }
}
