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

  const stream = new RedisWrapper.Stream(redis);

  t.context.client = redis;
  t.context.stream = stream;
  t.context.keys = ['reservations'];
});

test.after(async (t) => {
  const { client, keys } = t.context;
  await client.del(keys);
});

test.serial('crud', async (t) => {
  const { stream } = t.context;

  const postfix = stream.getPostFix();
  t.is(postfix, ':STREAM');

  await stream.add('reservations', {
    reference: '1',
    userReference: 'testorino',
    beginDate: '2020/10/10',
    beginTime: '112233',
    endDate: '2020/10/10',
    endTime: '223344',
    status: 'reserved',
    spotReference: 'Pallermo',
    receiptReference: 'qalRecibo',
  });

  await stream.add('reservations', {
    reference: '2',
    userReference: 'diego',
    beginDate: '2020/10/10',
    beginTime: '334455',
    endDate: '2020/10/10',
    endTime: 556677,
    status: 'cancelled',
    spotReference: 'Monaco',
    receiptReference: 'esta',
    active: true,
    nested: {
      object: {
        level: 2,
      },
    },
  });

  const response = await stream.range('reservations',
    {
      endTime: (s) => parseInt(s, 10),
      active: (s) => s === 'true',
      nested: {
        object: {
          level: (s) => parseInt(s, 10),
        },
      },
    },
    2);

  t.is(response.length, 2);
  t.is(response[0].reference, '1');
  t.is(response[1].reference, '2');
  t.is(response[1].nested.object.level, 2);
  t.is(response[1].active, true);
  t.is(response[1].endTime, 556677);

  const revResponse = await stream.revRange('reservations', {}, 1);

  t.is(revResponse.length, 1);
  t.is(revResponse[0].reference, '2');

  const invalidAdd = await stream.add('reservations', ['array arremangado']);

  t.is(invalidAdd, false);

  const noLimitRange = await stream.range('reservations');

  t.is(noLimitRange.length, 2);

  const noLimitRevRange = await stream.revRange('reservations');

  t.is(noLimitRevRange.length, 2);

  await stream.range('reservations', {}, 1, '-', '+', false);
  await stream.revRange('reservations', {}, 1, '-', '+', false);
});
