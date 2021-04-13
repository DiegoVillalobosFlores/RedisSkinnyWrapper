class Base {
	constructor() {
		this.data = {};
	}

	del(keys){
		let result = 0;
		for(const key of keys){
			const value = this.data[key];
			if(!value) continue;

			delete this.data[key];
			result++;
		}
		return result;
	}

	set(key, value){
		this.data[key] = value;
		return 'OK';
	}

	get(key){
		return this.data[key] || null;
	}

}

export default Base;
