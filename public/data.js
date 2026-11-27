import { firebaseConfig } from './firebase-config.js';
import { deleteTreeData } from './delete-tree.js';

const PAGE_SIZE = 12;
export const isDemo = !firebaseConfig || new URLSearchParams(location.search).get('demo') === '1';
const storageKey = 'sobok-trees-v1';

function localStore() {
  const demo = {
    name: '제인', background: null, styles: [0, 1], lit: false,
    letters: [
      { id: 'sample-1', author: '젠젠이', message: '올해도 함께해 줘서 고마워! 따뜻한 크리스마스 보내 ♡', style: 1, x: 56.5, y: 23.3 },
      { id: 'sample-2', author: '하루', message: '내년에도 맛있는 거 많이 먹으러 가자!', style: 0, x: 25.6, y: 77.5 },
    ],
  };
  const read = () => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { ...saved, demo: { ...demo, letters: saved.demo?.letters ?? demo.letters } };
  };
  function update(id, change) {
    const trees = read();
    trees[id] = change(trees[id]);
    localStorage.setItem(storageKey, JSON.stringify(trees));
  }
  const uid = 'local-tree';
  return {
    uid: () => uid,
    ownerId: () => uid,
    async signIn() {},
    async signOut() {},
    async deleteTree(id) {
      if (id !== uid) throw new Error('내 트리만 삭제할 수 있어요.');
      const trees = read();
      delete trees[id];
      localStorage.setItem(storageKey, JSON.stringify(trees));
    },
    async tree(id) { return read()[id]; },
    async create(fields) {
      if (!read()[uid]) update(uid, () => ({ ...fields, lit: true, letters: [] }));
      return uid;
    },
    async letters(id, cursor) {
      const all = read()[id].letters;
      const start = cursor ? all.findIndex(letter => letter.id === cursor) + 1 : 0;
      const letters = all.slice(start, start + PAGE_SIZE);
      return { letters, cursor: letters.at(-1)?.id, more: start + letters.length < all.length };
    },
    async add(id, fields) {
      const letter = { ...fields, id: crypto.randomUUID(), authorUid: uid };
      update(id, tree => ({ ...tree, letters: [letter, ...tree.letters] }));
      return letter;
    },
    async move(id, letterId, point) {
      update(id, tree => ({
        ...tree, letters: tree.letters.map(letter => letter.id === letterId ? { ...letter, ...point } : letter),
      }));
    },
    async light(id, lit) { update(id, tree => ({ ...tree, lit })); },
  };
}

async function cloudStore() {
  const [{ initializeApp }, authApi, db] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore-lite.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const firestore = db.getFirestore(app);
  await auth.authStateReady();
  const treeRef = id => db.doc(firestore, 'trees', id);
  const lettersRef = id => db.collection(treeRef(id), 'letters');
  const ownerId = () => auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : null;
  return {
    uid: () => auth.currentUser?.uid,
    ownerId,
    async signIn() {
      if (!ownerId()) await authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider());
    },
    async signOut() { await authApi.signOut(auth); },
    async deleteTree(id) {
      if (!ownerId() || id !== ownerId()) throw new Error('내 트리만 삭제할 수 있어요.');
      await deleteTreeData(db, firestore, treeRef(id), lettersRef(id));
    },
    async tree(id) {
      const result = await db.getDoc(treeRef(id));
      return result.data();
    },
    async create(fields) {
      const id = ownerId();
      if (!id) throw new Error('먼저 Google로 로그인해 주세요.');
      await db.runTransaction(firestore, async transaction => {
        const ref = treeRef(id);
        if (!(await transaction.get(ref)).exists()) {
          transaction.set(ref, { ...fields, lit: true, createdAt: db.serverTimestamp() });
        }
      });
      return id;
    },
    async letters(id, cursor) {
      const constraints = [db.orderBy('createdAt', 'desc'), db.limit(PAGE_SIZE)];
      if (cursor) constraints.push(db.startAfter(cursor));
      const result = await db.getDocs(db.query(lettersRef(id), ...constraints));
      return {
        letters: result.docs.map(item => ({ ...item.data(), id: item.id })),
        cursor: result.docs.at(-1),
        more: result.size === PAGE_SIZE,
      };
    },
    async add(id, fields) {
      if (!auth.currentUser) await authApi.signInAnonymously(auth);
      const letter = { ...fields, authorUid: auth.currentUser.uid };
      const ref = await db.addDoc(lettersRef(id), { ...letter, createdAt: db.serverTimestamp() });
      return { ...letter, id: ref.id };
    },
    async move(id, letterId, point) { await db.updateDoc(db.doc(lettersRef(id), letterId), point); },
    async light(id, lit) { await db.updateDoc(treeRef(id), { lit }); },
  };
}

export const connect = () => isDemo ? localStore() : cloudStore();

