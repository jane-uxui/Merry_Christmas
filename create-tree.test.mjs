import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('./public/data.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/export /g, '')
  .replace(/import\('https:[^']*firebase-app.js'\)/, 'Promise.resolve(appApi)')
  .replace(/import\('https:[^']*firebase-auth.js'\)/, 'Promise.resolve(authApiMock)')
  .replace(/import\('https:[^']*firebase-firestore-lite.js'\)/, 'Promise.resolve(dbMock)');
function context(extra = {}) {
  const saved = new Map();
  return vm.createContext({
    firebaseConfig: {}, location: { search: '?demo=1' }, URLSearchParams, crypto,
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    ...extra,
  });
}
const fields = { name: '테스트', background: 14, styles: [0, 1] };

test('new local tree has no background, lights, or letters; first letter appears only after add', async () => {
  const ctx = context();
  const store = vm.runInContext(source + '\nlocalStore()', ctx);
  const id = await store.create(fields);
  assert.equal((await store.tree(id)).background, 14);
  assert.equal((await store.tree(id)).lit, false);
  assert.equal((await store.letters(id)).letters.length, 0);
  assert.equal((await store.letters('demo')).letters.length, 0);
  await store.add(id, { author: '친구', message: '안녕', style: 0, x: 50, y: 50 });
  assert.equal((await store.letters(id)).letters.length, 1);
  await assert.rejects(store.create(fields), /이미 트리가/);
  assert.equal((await store.letters(id)).letters.length, 1);
});

test('cloud creation stores plain defaults and never writes seeded letter documents', async () => {
  let exists = false;
  const writes = [];
  const ctx = context({
    appApi: { initializeApp: () => ({}) },
    authApiMock: { getAuth: () => ({ authStateReady: async () => {}, currentUser: { uid: 'owner', isAnonymous: false } }) },
    dbMock: {
      getFirestore: () => ({}), doc: (_, collection, id) => collection + '/' + id,
      serverTimestamp: () => 'timestamp',
      runTransaction: async (_, callback) => callback({
        get: async () => ({ exists: () => exists }),
        set: (ref, value) => { writes.push({ ref, value }); exists = true; },
      }),
    },
  });
  const store = await vm.runInContext(source + '\ncloudStore()', ctx);
  await store.create({ name: '테스트', background: null, styles: [0, 1] });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].ref, 'trees/owner');
  assert.equal(writes[0].value.background, 14);
  assert.equal(writes[0].value.lit, false);
  assert.equal('letters' in writes[0].value, false);
  await assert.rejects(store.create(fields), /이미 트리가/);
  assert.equal(writes.length, 1);
});
