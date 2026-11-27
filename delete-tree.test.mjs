import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteTreeData } from './public/delete-tree.js';

function fixture(count, failAt = -1) {
  let parent = { name: 'test' }, commits = 0;
  const letters = new Map(Array.from({ length: count }, (_, i) => ['letter-' + i, {}]));
  const db = {
    limit: n => n,
    query: (_, limit) => limit,
    async getDocs(limit) {
      const docs = [...letters.keys()].slice(0, limit).map(ref => ({ ref }));
      return { docs, empty: !docs.length };
    },
    async runTransaction(_, callback) {
      const writes = [];
      const result = await callback({
        get: async () => ({ exists: () => !!parent, data: () => parent }),
        update: (_, fields) => writes.push(() => { parent = { ...parent, ...fields }; }),
        delete: ref => writes.push(() => {
          if (ref === 'tree') {
            assert.equal(letters.size, 0, 'parent cannot be removed before all letters');
            parent = null;
          } else letters.delete(ref);
        }),
      });
      if (++commits === failAt) throw new Error('offline');
      writes.forEach(write => write());
      return result;
    },
  };
  return { db, letters, parent: () => parent, remove: () => deleteTreeData(db, {}, 'tree', 'letters') };
}

test('deletes all pages before deleting the tree', async () => {
  const store = fixture(29);
  await store.remove();
  assert.equal(store.letters.size, 0);
  assert.equal(store.parent(), null);
  await store.remove(); // Already deleted is safe.
});
test('interrupted deletion retains a lock and can resume', async () => {
  const store = fixture(29, 3);
  await assert.rejects(store.remove(), /offline/);
  assert.ok(store.parent().deleting);
  assert.equal(store.letters.size, 17);
  await store.remove();
  assert.equal(store.letters.size, 0);
  assert.equal(store.parent(), null);
});
test('empty tree can be deleted', async () => {
  const store = fixture(0);
  await store.remove();
  assert.equal(store.parent(), null);
});
