class SortedSet {
	constructor(redis) {
		this.redis = redis;
		this.isMulti = false;
		this.client = redis;
		this.POSTFIX = 'ZSET';
		this.CONNECTOR = ':';
	}

	multi(){
		this.isMulti = true;
		this.redis = this.client.multi();
	}

	async exec(format = true){
		if(!this.isMulti) return false;
		const response = await this.redis.exec();
		this.isMulti = false;
		this.redis = this.client;
		return format ? response.map(([, results]) => results) : response;
	}

	add(key, value, weight){
		return this.redis.zadd(key, weight, value);
	}

	range(key, begin = 0, end = -1){
		return this.redis.zrange(key, begin, end);
	}

	revRange(key, begin = 0, end = -1){
		return this.redis.zrevrange(key, begin, end);
	}

	remove(key, values){
		return this.redis.zrem(key, values);
	}

	score(key, value){
		return this.redis.zscore(key, value);
	}
}

export default SortedSet;
