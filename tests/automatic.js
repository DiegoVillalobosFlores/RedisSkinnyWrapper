/* eslint-disable no-param-reassign */
import test from 'ava';
import IOredis from 'ioredis';
import dotenv from 'dotenv';

import RedisWrapper from '../src';

dotenv.config();

test.before((t) => {
  const redis = new IOredis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    db: 1,
  });

  const automatic = new RedisWrapper.Automatic(redis, undefined, true);

  t.context.client = redis;
  t.context.automatic = automatic;
  t.context.keys = [
    'test:METRICS:ZSET',
    'test:DBS:REDIS:HASH',
    'test:DBS:HASH',
    'test:DBS:MONGO:HASH',
    'test:DATES:ZSET',
    'test:HASH',
    'test:REPOS:ZSET',
    'invalidType:HASH',
  ];
});

test.after(async (t) => {
  const { client, keys } = t.context;
  await client.del(keys);
});

test.serial('crud no schema', async (t) => {
  const { automatic } = t.context;

  t.is(automatic.getSchema(), undefined);

  const noSchemaGet = await t.throwsAsync(automatic.get('test'));
  t.is(noSchemaGet.message, 'No Schema defined, first define a schema before trying to get any value');

  const invalid = await t.throwsAsync(automatic.add('invalid', { invalid: undefined }));
  t.is(invalid.message, 'Invalid Field: invalid');

  const noValues = await t.throwsAsync(automatic.add('noValues', 'notAnObject'));
  t.is(noValues.message, 'The second parameter "value" must be of type "object", got: string');

  const unsupportedBooleanArray = await t.throwsAsync(automatic.add('booleanArray', { array: [true, false, true] }));
  t.is(unsupportedBooleanArray.message, 'Currently only arrays of strings, numbers and {value,score} objects are supported for field: array');

  const functionType = await t.throwsAsync(automatic.add('function', { fun: () => true }));
  t.is(functionType.message, 'Invalid value type for field: fun, function');

  const emptyObject = await t.throwsAsync(automatic.add('emptyObject', { value: {} }));
  t.is(emptyObject.message, 'Empty objects are not currently supported for field: value');

  const result = await automatic.add('test', {
    name: 'diego',
    age: 9999,
    height: 2.13,
    active: true,
    repos: [
      'quizMaaz',
      'redisSkinnyWrapper',
    ],
    dates: [
      2020,
      2021,
    ],
    metrics: [
      {
        value: 'metric20',
        score: 20,
      },
      {
        value: 'metric11',
        score: 11,
      },
    ],
    dbs: {
      sql: 'no',
      redis: {
        status: 'open',
        wrapper: true,
      },
      mongo: {
        status: 'expired',
        wrapper: false,
      },
    },
  });

  t.is(result.every((value) => value === 1), true);

  const schema = automatic.getSchema();

  t.is(schema.name, 'string');
  t.is(schema.age, 'int');
  t.is(schema.height, 'float');
  t.is(schema.active, 'boolean');
  t.is(schema.repos, 'array');
  t.is(schema.dates, 'array');
  t.is(schema.metrics, 'arrayWeighted');
  t.is(schema.dbs.sql, 'string');
  t.is(schema.dbs.redis.status, 'string');
  t.is(schema.dbs.redis.wrapper, 'boolean');
  t.is(schema.dbs.mongo.status, 'string');
  t.is(schema.dbs.mongo.wrapper, 'boolean');

  const missingType = await t.throwsAsync(automatic.add('missingType', { type: false }));
  t.is(missingType.message, 'Field type is not in the schema or its type is different, expected: undefined, got: boolean');

  const getterResult = await automatic.get('test');

  t.is(getterResult.name, 'diego');
  t.is(getterResult.age, 9999);
  t.is(getterResult.height, 2.13);
  t.is(getterResult.active, true);
  t.is(getterResult.repos.length, 2);
  t.is(getterResult.repos[0], 'quizMaaz');
  t.is(getterResult.repos[1], 'redisSkinnyWrapper');
  t.is(getterResult.dates.length, 2);
  t.is(getterResult.dates[0], '2020');
  t.is(getterResult.dates[1], '2021');
  t.is(getterResult.metrics.length, 2);
  t.is(getterResult.metrics[0].value, 'metric11');
  t.is(getterResult.metrics[0].score, 11);
  t.is(getterResult.metrics[1].value, 'metric20');
  t.is(getterResult.metrics[1].score, 20);
  t.is(getterResult.dbs.sql, 'no');
  t.is(getterResult.dbs.redis.status, 'open');
  t.is(getterResult.dbs.redis.wrapper, true);
  t.is(getterResult.dbs.mongo.status, 'expired');
  t.is(getterResult.dbs.mongo.wrapper, false);

  await automatic.add('test', {
    name: 'test', dbs: { sql: 'yes', mongo: { wrapper: true } }, dates: [2022], metrics: [{ value: 'metric11', score: 21 }],
  });

  const updatedResult = await automatic.get('test');

  t.is(updatedResult.name, 'test');
  t.is(updatedResult.dbs.sql, 'yes');
  t.is(updatedResult.dbs.mongo.wrapper, true);
  t.is(updatedResult.dates.length, 3);
  t.is(updatedResult.dates[1], '2022');
  t.is(updatedResult.metrics[0].value, 'metric20');
  t.is(updatedResult.metrics[1].value, 'metric11');
  t.is(updatedResult.metrics[1].score, 21);

  const newSchemaResult = automatic.setSchema({
    age: '1', dbs: { sql: 2 }, metrics: ['metric11'], newValue: { value: { new: true } },
  });

  t.is(newSchemaResult.age, 'string');
  t.is(newSchemaResult.dbs.sql, 'int');

  const updatedSchemaResult = await automatic.get('test');

  t.is(updatedSchemaResult.age, '9999');
  t.is(updatedSchemaResult.dbs.sql, NaN);
  t.is(updatedSchemaResult.metrics[0], 'metric20');
  t.is(updatedSchemaResult.metrics[1], 'metric11');
  t.is(typeof updatedSchemaResult.newValue.value, 'object');
});

test.serial('crud with schema', (t) => {
  const { client } = t.context;
  const automatic = new RedisWrapper.Automatic(client, { name: 'string', length: 'float' }, false);

  const schemaResult = automatic.getSchema();

  t.is(schemaResult.name, 'string');
  t.is(schemaResult.length, 'float');
});
