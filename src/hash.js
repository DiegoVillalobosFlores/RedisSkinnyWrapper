class Hash {
  constructor(redis) {
    this.redis = redis;
    this.POSTFIX = 'HASH';
    this.CONNECTOR = ':';
  }

  add(key, fields) {
    return this.redis.hset(key, fields);
  }

  get(key, fields) {
    return this.redis.hmget(key, fields);
  }

  getAll(key) {
    return this.redis.hgetall(key);
  }

  remove(key, field) {
    return this.redis.hdel(key, field);
  }
}

export default Hash;
