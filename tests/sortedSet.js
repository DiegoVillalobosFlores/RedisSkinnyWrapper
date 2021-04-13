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

	const sortedSet = new RedisWrapper.SortedSet(redis);

	t.context.client = redis;
	t.context.sortedSet = sortedSet;
	t.context.keys = ['test', 'pipeline'];
});

test.after(async t => {
	const { client, keys } = t.context;
	await client.del(keys);
});

test.serial('crud', async t => {
	const { sortedSet } = t.context;

	t.is(sortedSet.POSTFIX, 'ZSET');

	await sortedSet.add('test', 'diego', 2);

	const rangeResponse = await sortedSet.range('test');

	t.is(rangeResponse.length, 1);
	t.is(rangeResponse[0], 'diego');

	await sortedSet.add('test', 'diego - 1', 1);

	const revRangeResponse = await sortedSet.revRange('test');

	t.is(revRangeResponse.length, 2);
	t.is(revRangeResponse[0], 'diego');
	t.is(revRangeResponse[1],'diego - 1');

	await sortedSet.remove('test', ['diego']);

	const deletedResponse = await sortedSet.range('test');

	t.is(deletedResponse.length, 1);
	t.is(deletedResponse[0],'diego - 1');

	const score = await sortedSet.score('test', 'diego - 1');

	t.is(score, '1');

	const invalidScore = await sortedSet.score('test', 'invalid');

	t.is(invalidScore,null);
});

test.serial('pipeline', async t => {
	const { sortedSet } = t.context;

	sortedSet.multi();

	sortedSet.add('pipeline', 'diego', 2);
	sortedSet.add('pipeline', 'thomas', 3);
	sortedSet.add('pipeline', 'bea', 4);
	sortedSet.range('pipeline');

	const response = await sortedSet.exec();

	t.is(response.length,4);
	t.is(response[0],1);
	t.is(response[1],1);
	t.is(response[2],1);
	t.is(response[3].length,3);
	t.is(response[3][0],'diego');
	t.is(response[3][1],'thomas');
	t.is(response[3][2],'bea');

	const failedResponse = await sortedSet.exec();

	t.is(failedResponse, false);

	sortedSet.multi();

	sortedSet.add('pipeline', 'diego 2', 3);
	sortedSet.remove('pipeline', ['diego','bea']);
	sortedSet.range('pipeline');

	const reformattedResponse = await sortedSet.exec(false);

	t.is(reformattedResponse.length, 3);
	t.is(reformattedResponse[0].length, 2);
	t.is(reformattedResponse[0][0], null);
	t.is(reformattedResponse[0][1], 1);
	t.is(reformattedResponse[1][0], null);
	t.is(reformattedResponse[1][1], 2);
	t.is(reformattedResponse[2][0], null);
	t.is(reformattedResponse[2][1].length, 2);
	t.is(reformattedResponse[2][1][0], 'diego 2');
	t.is(reformattedResponse[2][1][1], 'thomas');
});
