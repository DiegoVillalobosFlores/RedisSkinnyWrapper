import flatten from 'flat';

const { unflatten } = flatten;

class Stream {
  constructor(redis) {
    this.redis = redis;
    this.FLAT_DELIMITER = '~';
    this.POSTFIX = 'STREAM';
    this.CONNECTOR = ':';
  }

  getPostFix() {
    return `${this.CONNECTOR}${this.POSTFIX}`;
  }

  formatResponse(response, schema) {
    const flattenSchema = schema
      ? flatten(schema, { delimiter: this.FLAT_DELIMITER })
      : {};
    return response.map(([_messageId, data]) => {
      const result = { _messageId };
      for (let i = 0; i < data.length; i += 2) {
        const field = data[i];
        result[field] = flattenSchema[field]
          ? flattenSchema[field](data[i + 1])
          : data[i + 1];
      }
      return unflatten(result, { delimiter: this.FLAT_DELIMITER });
    });
  }

  add(key, value, id = '*') {
    if (!value || value.constructor.name !== 'Object') return false;

    const values = Object.entries(
      flatten(value, { delimiter: this.FLAT_DELIMITER }),
    ).flat();
    return this.redis.xadd(key, id, values);
  }

  async range(key, schema, limit, begin = '-', end = '+', format = true) {
    const args = [key, begin, end];
    if (limit) {
      args.push('COUNT');
      args.push(limit);
    }
    const response = await this.redis.xrange(args);
    return format ? this.formatResponse(response, schema) : response;
  }

  async revRange(key, schema, limit, begin = '-', end = '+', format = true) {
    const args = [key, end, begin];
    if (limit) {
      args.push('COUNT');
      args.push(limit);
    }
    const response = await this.redis.xrevrange(args);
    return format ? this.formatResponse(response, schema) : response;
  }
}

export default Stream;
