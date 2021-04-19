# RedisSkinnyWrapper
A  thin, experimental untested, unstable but pretty cool redis wrapper that should never be used in production unless you want to get permanent vacations @ work

## Install

``yarn add redis-skinny-wrapper``

## Usage

```
import Redis from 'ioredis';
import RedisWrapper from 'redis-skinny-wrapper';

const redis = new Redis();

const automatic = new RedisWrapper.Automatic(redis);
const hash = new RedisWrapper.Hash(redis);
const stream = new RedisWrapper.Stream(redis);
const sortedSet = new RedisWrapper.SortedSet(redis);
const geoSet = new RedisWrapper.Geo(redis);
```

## API
### Automatic
This wrapper allows you to pass an object and automatically store the values
in the best way possible by determining an `schema` either by setting it up when
initializing the instance of the class or by letting the wrapper determine it by itself with
the `add` command

schema:
```javascript
const schema = {
  string: 'string',
  int: 'int',
  float: 'float',
  boolean: 'boolean',
  array: 'array',
  arrayWeighted: 'arrayWeighted',
  nestedObject: {
    nestedValue: 'string'
  }
}
const automatic = new RedisWrapper.automatic(redis, schema);

console.log(automatic.getSchema());
/*
  string: 'string',
  int: 'int',
  float: 'float',
  boolean: 'boolean',
  array: 'array',
  arrayWeighted: 'arrayWeighted',
  nestedObject: {
    nestedValue: 'string'
  }
 */

const automaticWithoutSchema = new RedisWrapper.automatic(redis);

const automaticValue = {
  aString: 'a string',
  anInt: 420,
  aFloat: 3.14,
  aBoolean: false,
  anArrayOfStrings: [
    'first',
    'second'
  ],
  anArrayWithScores: [
    {
      value: 'second',
      score: 2
    },
    {
      value: 'third',
      score: 3
    },
    {
      value: 'zero',
      score: 0
    }
  ],
  aNestedObject: {
    level1: {
      level2: 'this a nested nested object!'
    }
  }
}

await automaticWithoutSchema.add('test', automaticValue);

console.log(automaticWithoutSchema.getSchema());
/*
{
  aString: 'string',
  anInt: 'int',
  aFloat: 'float',
  aBoolean: 'boolean',
  anArrayOfStrings: 'array',
  anArrayWithScores: 'arrayWeighted',
  aNestedObject: { level1: { level2: 'string' } }
}
 */

```
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
