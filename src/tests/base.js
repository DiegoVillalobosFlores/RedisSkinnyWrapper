import test from 'ava';
import IOredis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

import RedisWrapper from '../src';

test.before(t => {
	const redis = new IOredis({
		port: process.env.REDIS_PORT,
		host: process.env.REDIS_HOST,
		db: 1,
	});

	const base = new RedisWrapper.Base(redis);

	t.context.client = redis;
	t.context.base = base;
	t.context.keys = ['keyToDelete'];
});

test.after(async t => {
	const { client, keys } = t.context;
	await client.del(keys);
});

test.serial('crud', async t => {
	const { base } = t.context;

	await base.set('keyToDelete', 'delete me plz');

	const response = await base.get('keyToDelete');

	t.is(response, 'delete me plz');

	await base.del('keyToDelete');

	const nullResponse = await base.get('keyToDelete');

	t.is(nullResponse, null);
});
