const formatRangeResult = (rangeResult) => {
  const result = [];
  for (let i = 0; i < rangeResult.length; i += 2) {
    result.push({ value: rangeResult[i], score: parseInt(rangeResult[i + 1], 10) });
  }
  return result;
};

class SortedSet {
  constructor(redis) {
    this.redis = redis;
    this.isMulti = false;
    this.client = redis;
    this.POSTFIX = 'ZSET';
    this.CONNECTOR = ':';
  }

  multi() {
    this.isMulti = true;
    this.redis = this.client.multi();
  }

  getPostFix() {
    return `${this.CONNECTOR}${this.POSTFIX}`;
  }

  async exec(format = true) {
    if (!this.isMulti) return false;
    const response = await this.redis.exec();
    this.isMulti = false;
    this.redis = this.client;
    return format ? response.map(([, results]) => results) : response;
  }

  add(key, value, weight) {
    return this.redis.zadd(key, weight, value);
  }

  async range(key, withScores = false, begin = 0, end = -1) {
    const query = [key, begin, end];
    if (withScores) {
      query.push('WITHSCORES');
      const result = await this.redis.zrange(query);
      return formatRangeResult(result);
    }
    return this.redis.zrange(query);
  }

  async revRange(key, withScores = false, begin = 0, end = -1) {
    const query = [key, begin, end];
    if (withScores) {
      query.push('WITHSCORES');
      const result = await this.redis.zrevrange(query);
      return formatRangeResult(result);
    }
    return this.redis.zrevrange(query);
  }

  remove(key, values) {
    return this.redis.zrem(key, values);
  }

  score(key, value) {
    return this.redis.zscore(key, value);
  }
}

export default SortedSet;
