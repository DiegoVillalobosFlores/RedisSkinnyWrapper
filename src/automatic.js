import Hash from './hash';
import SortedSet from './sortedSet';

const formatKey = (key, withPostFix, dataStructure) => (withPostFix ? `${key}${dataStructure.getPostFix()}` : key);

const getObjectKey = (key, field) => `${key}:${field.toUpperCase()}`;

const getArrayKey = (key, field) => `${key}:${field.toUpperCase()}`;

export default class Automatic {
  constructor(redis, schema, withPostFix) {
    this.redis = redis;
    this.schema = schema;

    const hash = new Hash(redis);
    const sortedSet = new SortedSet(redis);

    this.schemaMapGet = {
      hash: (key) => hash.getAll(formatKey(key, withPostFix, hash)),
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
            if (value.every(({ value: element, score }) => typeof element === 'string' && typeof score === 'number')) newSchema[field] = 'arrayWeighted';
            else if (value.every((element) => typeof element === 'string' || typeof element === 'number')) newSchema[field] = 'array';
            else throw new Error(`Currently only arrays of strings, numbers and {value,score} objects are supported for field: ${field}`);
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

  setSchema(values) {
    const newSchema = this.generateSchema(values);
    this.schema = newSchema;
    return newSchema;
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
        promises = [
          ...promises,
          ...this.saveObject(getObjectKey(key, field), value, schema[field]),
        ];
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
    const values = Object.entries(schema).filter(([, value]) => typeof value === 'string');

    let hashValue = false;
    for (let i = 0; i < values.length; i += 1) {
      const [field, value] = values[i];
      switch (value) {
        case 'array':
          // eslint-disable-next-line no-await-in-loop
          result[field] = await this.schemaMapGet.array(getArrayKey(key, field));
          break;
        case 'arrayWeighted':
          // eslint-disable-next-line no-await-in-loop
          result[field] = await this.schemaMapGet.arrayWeighted(getArrayKey(key, field));
          break;
        default:
          hashValue = true;
      }
    }

    if (hashValue) {
      const hashResult = await this.schemaMapGet.hash(key);
      result = Object.entries(hashResult).reduce((acc, [field, value]) => {
        switch (schema[field]) {
          case 'int':
            acc[field] = parseInt(value, 10);
            break;
          case 'float':
            acc[field] = parseFloat(value);
            break;
          case 'boolean':
            acc[field] = value === 'true';
            break;
          default:
            if (schema[field]) acc[field] = value;
        }
        return acc;
      }, result);
    }

    const objects = Object.entries(schema).filter(
      ([, value]) => typeof value === 'object',
    );

    for (let i = 0; i < objects.length; i += 1) {
      const [field, objectSchema] = objects[i];
      // eslint-disable-next-line no-await-in-loop
      result[field] = await this.getObject(getObjectKey(key, field), objectSchema);
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
