import assert from 'node:assert/strict';
import { describe, test } from 'node:test';


describe('Simple tests', () => {
  test('synchronous passing test', () => {
    // This test passes because it does not throw an exception.
    assert.strictEqual(1, 1);
  });
});
