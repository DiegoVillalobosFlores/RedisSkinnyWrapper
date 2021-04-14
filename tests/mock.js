/* eslint-disable no-param-reassign */
import test from 'ava';

import RedisMock from '../mock';

test.before((t) => {
  t.context.base = new RedisMock.Base();
  t.context.stream = new RedisMock.Stream();
});

test('base', async (t) => {
  const { base } = t.context;

  const setResult = await base.set('key', 'value');

  t.is(setResult, 'OK');

  const getResult = await base.get('key');

  t.is(getResult, 'value');

  const delResult = await base.del(['key']);

  t.is(delResult, 1);

  const nullGet = await base.get('key');

  t.is(nullGet, null);
});

test('stream', async (t) => {
  const { stream } = t.context;

  const addResult = await stream.add('key',
    { id: 'test', nested: { object: true } });

  t.is(addResult, 0);

  const rangeResult = await stream.range('key');

  t.is(rangeResult.length, 1);
  // eslint-disable-next-line no-underscore-dangle
  t.is(rangeResult[0]._messageId, 0);
});
