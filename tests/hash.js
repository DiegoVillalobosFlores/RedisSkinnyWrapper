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

  const hash = new RedisWrapper.Hash(redis);

  t.context.client = redis;
  t.context.hash = hash;
  t.context.keys = ['schedule.today'];
});

test.afterEach(async (t) => {
  const { client, keys } = t.context;
  await client.del(keys);
});

test.serial('hash', async (t) => {
  const { hash } = t.context;

  t.is(hash.POSTFIX, 'HASH');

  await hash.add('schedule.today', [
    120, 'reservation1',
    121, 'reservation1',
    1420, 'reservation2',
  ]);

  const response = await hash.get('schedule.today', [110, 120, 200, 1419, 1420]);

  t.is(response.length, 5);
  t.is(response[0], null);
  t.is(response[1], 'reservation1');
  t.is(response[2], null);
  t.is(response[3], null);
  t.is(response[4], 'reservation2');

  await hash.remove('schedule.today', 121);

  const removedResponse = await hash.get('schedule.today', [120, 121]);

  t.is(removedResponse.length, 2);
  t.is(removedResponse[0], 'reservation1');
  t.is(removedResponse[1], null);

  const getAllResponse = await hash.getAll('schedule.today');
  t.is(getAllResponse['120'], 'reservation1');
  t.is(getAllResponse['1420'], 'reservation2');
});
