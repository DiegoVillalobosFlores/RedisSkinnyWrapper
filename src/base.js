class Base {
	constructor(redis) {
		this.redis = redis;
	}

	async del(keys){
		return this.redis.del(keys);
	}

	async set(key, value){
		return this.redis.set(key, value);
	}

	async get(key){
		return this.redis.get(key);
	}
}

export default Base;
