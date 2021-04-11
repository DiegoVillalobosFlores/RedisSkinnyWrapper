import SortedSet from './sortedSet';

class Geo extends SortedSet{
	constructor(redis) {
		super(redis);
		this.redis = redis;
	}

	add(key, name, lon, lat){
		return this.redis.geoadd(key, lon, lat, name);
	}

	distance(key, from, to, unit = 'm'){
		return this.redis.geodist(key, from, to, unit);
	}

	async radius(
		key,
		lon,
		lat,
		radius,
		limit,
		unit = 'm',
		distance = true,
		coordinates = true,
		orientation = 'ASC',
		format = true
	) {
		const args = [key,lon,lat, radius,unit, orientation];
		if (distance) args.push('WITHDIST');
		if (coordinates) args.push('WITHCOORD');
		if (limit) {
			args.push('COUNT');
			args.push(limit);
		}

		const response = await this.redis.georadius(args);

		return format ? response.map(r => {
			const value = { name: r[0] };
			if(distance) value.distance = r[1];
			if(coordinates) {
				let pos = 1;
				if (distance) pos++;
				value.coordinates = {
					lon: r[pos][0],
					lat: r[pos][1]
				};
			}

			return value;
		}) : response;
	}

}

export default Geo;
