import test from 'node:test';
import { assert } from './assert';

test('test harness boots', () => {
  assert.equal(1 + 1, 2);
});
