// Keep the parent until every letter is gone. A token makes retries and
// concurrent tabs safe, even if a new tree is created at the same path.
export async function deleteTreeData(db, firestore, ref, lettersRef) {
  const token = await db.runTransaction(firestore, async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return null;
    const existing = snapshot.data().deleting;
    if (existing) return existing;
    const value = crypto.randomUUID();
    tx.update(ref, { deleting: value });
    return value;
  });
  if (!token) return;
  while (true) {
    const page = await db.getDocs(db.query(lettersRef, db.limit(12)));
    const finished = await db.runTransaction(firestore, async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists() || snapshot.data().deleting !== token) return true;
      for (const letter of page.docs) tx.delete(letter.ref);
      if (page.empty) tx.delete(ref);
      return page.empty;
    });
    if (finished) return;
  }
}
