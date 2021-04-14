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

  const geo = new RedisWrapper.Geo(redis);

  t.context.client = redis;
  t.context.geo = geo;
  t.context.keys = ['Berlin'];
});

test.afterEach(async (t) => {
  const { client, keys } = t.context;
  await client.del(keys);
});

test.serial('crud', async (t) => {
  const { geo } = t.context;

  t.is(geo.POSTFIX, 'ZSET');

  await geo.add('Berlin', 'Uhlandstrasse Bhf', 13.326173, 52.502782);
  await geo.add('Berlin', 'Kleistpark Bhf', 13.360329, 52.490646);
  await geo.add('Berlin', 'Fehrbelliner Platz Bhf', 13.314760, 52.490248);

  const response = await geo.range('Berlin');

  t.is(response.length, 3);
  t.is(response[0], 'Fehrbelliner Platz Bhf');
  t.is(response[1], 'Kleistpark Bhf');
  t.is(response[2], 'Uhlandstrasse Bhf');

  const radius = await geo.radius('Berlin', 13.323561, 52.486553, 5000);

  t.is(radius.length, 3);
  t.is(radius[0].name, 'Fehrbelliner Platz Bhf');
  t.is(radius[0].distance, '723.9893');
  t.is(radius[0].coordinates.lon, '13.31476181745529175');
  t.is(radius[0].coordinates.lat, '52.49024904831965443');

  t.is(radius[1].name, 'Uhlandstrasse Bhf');
  t.is(radius[1].distance, '1813.8679');
  t.is(radius[1].coordinates.lon, '13.32617193460464478');
  t.is(radius[1].coordinates.lat, '52.50278324445258704');

  t.is(radius[2].name, 'Kleistpark Bhf');
  t.is(radius[2].distance, '2531.3873');
  t.is(radius[2].coordinates.lon, '13.36032718420028687');
  t.is(radius[2].coordinates.lat, '52.49064699954166713');

  const limitedRadius = await geo.radius('Berlin', 13.323561, 52.486553, 5000, 1);

  t.is(limitedRadius.length, 1);
  t.is(limitedRadius[0].name, 'Fehrbelliner Platz Bhf');

  const distance = await geo.distance('Berlin', 'Fehrbelliner Platz Bhf', 'Kleistpark Bhf');

  t.is(distance, '3086.2314');

  const radiusNameOnly = await geo.radius('Berlin', 13.323561, 52.486553, 5000, 10, 'm', false, false, 'desc');

  t.is(radiusNameOnly.length, 3);
  t.is(radiusNameOnly[0].distance, undefined);
  t.is(radiusNameOnly[0].coordinates, undefined);

  const radiusCoordNoDist = await geo.radius('Berlin', 13.323561, 52.486553, 1000, 10, 'm', false, true);

  t.is(radiusCoordNoDist.length, 1);
  t.is(radiusCoordNoDist[0].name, 'Fehrbelliner Platz Bhf');
  t.is(radiusCoordNoDist[0].distance, undefined);

  const radiusNoFormat = await geo.radius('Berlin', 13.323561, 52.486553, 1000, 10, 'm', false, false, 'asc', false);
  t.is(radiusNoFormat.length, 1);
  t.is(radiusNoFormat[0], 'Fehrbelliner Platz Bhf');
});
