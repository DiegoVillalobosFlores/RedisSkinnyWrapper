# RedisSkinnyWrapper
A  thin, experimental untested, unstable but pretty cool redis wrapper that should never be used in production unless you want to get permanent vacations @ work

## Install

``yarn add redis-skinny-wrapper``

## Usage

```
import Redis from 'ioredis';
import RedisWrapper from 'redis-skinny-wrapper';

const redis = new Redis();

const hash = new RedisWrapper.Hash(redis);
const stream = new RedisWrapper.Stream(redis);
const sortedSet = new RedisWrapper.SortedSet(redis);
const geoSet = new RedisWrapper.Geo(redis);
```

## API
### Hash
```
add(key, fields)
add("HASH_KEY", {name: "test", value: 3})
key: string
fields: Array | Object
returns an integer if successful with the number of fields written

get(key, fields)
key: string
fields: Array | Object
returns a formated object if successful with the number of fields written
```
