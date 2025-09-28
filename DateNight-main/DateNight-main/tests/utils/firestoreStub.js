const clone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createDocRef = (path) => {
  const segments = path.split("/");
  const id = segments[segments.length - 1];
  const parentPath = segments.slice(0, -1).join("/");
  return { path, id, parentPath };
};

const createDocSnapshot = (path, entry) => {
  const data = entry?.data ?? null;
  return {
    id: path.split("/").pop(),
    ref: createDocRef(path),
    data: () => (data ? clone(data) : {}),
    exists: () => Boolean(entry),
    updateTime: {
      toMillis: () => entry?.updateTime ?? Date.now(),
    },
  };
};

const applyUpdate = (target, update) => {
  const base = isPlainObject(target) ? clone(target) : {};
  Object.entries(update || {}).forEach(([key, value]) => {
    if (value && value.__op === "arrayUnion") {
      const existing = Array.isArray(base[key]) ? base[key] : [];
      const merged = Array.from(new Set([...existing, ...value.values]));
      base[key] = merged;
      return;
    }

    if (value && value.__op === "increment") {
      const current = typeof base[key] === "number" ? base[key] : 0;
      base[key] = current + value.value;
      return;
    }

    if (isPlainObject(value)) {
      base[key] = applyUpdate(base[key], value);
      return;
    }

    base[key] = value;
  });
  return base;
};

const createFirestoreModule = (options = {}) => {
  const { initialDocs = {} } = options;
  const state = {
    docs: new Map(),
    setDocCalls: [],
    addDocCalls: [],
    collectionCalls: [],
    docCalls: [],
    getDocCalls: [],
    getDocsCalls: [],
    onSnapshotListeners: [],
    writeBatches: [],
    queryCalls: [],
  };

  Object.entries(initialDocs).forEach(([path, entry]) => {
    const payload = isPlainObject(entry) && "data" in entry ? entry : { data: entry };
    state.docs.set(path, {
      data: clone(payload.data ?? {}),
      updateTime: payload.updateTime ?? Date.now(),
    });
  });

  let idCounter = 0;

  const db = { __isDb: true };

  const resolvePath = (segments) => segments.filter(Boolean).join("/");

  const module = {
    serverTimestamp: () => ({ __op: "serverTimestamp", value: Date.now() }),
    increment: (value) => ({ __op: "increment", value }),
    arrayUnion: (...values) => ({ __op: "arrayUnion", values }),
    collection: (target, ...segments) => {
      let path;
      if (target && target.__isDb) {
        path = resolvePath(segments);
      } else if (target && typeof target.path === "string") {
        path = resolvePath([target.path, ...segments]);
      } else {
        throw new Error("Unsupported collection target");
      }
      const ref = { path };
      state.collectionCalls.push({ path });
      return ref;
    },
    doc: (target, ...segments) => {
      let path;
      if (target && target.__isDb) {
        path = resolvePath(segments);
      } else if (target && typeof target.path === "string") {
        path = resolvePath([target.path, ...segments]);
      } else {
        throw new Error("Document references must start from db");
      }
      const ref = createDocRef(path);
      state.docCalls.push({ path });
      return ref;
    },
    getDoc: async (ref) => {
      const entry = state.docs.get(ref.path);
      const snapshot = createDocSnapshot(ref.path, entry);
      state.getDocCalls.push({ ref });
      return snapshot;
    },
    setDoc: async (ref, data, options = {}) => {
      const existing = state.docs.get(ref.path)?.data ?? {};
      const next = options.merge ? applyUpdate(existing, data) : clone(data);
      state.docs.set(ref.path, { data: next, updateTime: Date.now() });
      state.setDocCalls.push({ ref, data: clone(data), options: { ...options }, result: clone(next) });
    },
    addDoc: async (collectionRef, data) => {
      const id = `auto-${idCounter += 1}`;
      const path = `${collectionRef.path}/${id}`;
      state.docs.set(path, { data: clone(data), updateTime: Date.now() });
      const ref = createDocRef(path);
      state.addDocCalls.push({ collectionRef, data: clone(data), ref });
      return ref;
    },
    getDocs: async (collectionOrQuery) => {
      const path = collectionOrQuery.path ?? collectionOrQuery.collectionRef?.path;
      state.getDocsCalls.push({ target: collectionOrQuery });
      const docs = [];
      if (path) {
        const prefix = `${path}/`;
        state.docs.forEach((entry, storedPath) => {
          if (storedPath === path || storedPath.startsWith(prefix)) {
            if (storedPath === path) {
              docs.push(createDocSnapshot(storedPath, entry));
            } else {
              docs.push(createDocSnapshot(storedPath, entry));
            }
          }
        });
      }
      return {
        docs,
        forEach: (callback) => {
          docs.forEach((doc) => callback(doc));
        },
      };
    },
    query: (collectionRef, ...clauses) => {
      const queryRef = { collectionRef, clauses };
      state.queryCalls.push(queryRef);
      return queryRef;
    },
    where: (...args) => ({ __op: "where", args }),
    orderBy: (...args) => ({ __op: "orderBy", args }),
    onSnapshot: (queryRef, onNext, onError) => {
      const listener = { queryRef, onNext, onError };
      state.onSnapshotListeners.push(listener);
      return () => {
        state.onSnapshotListeners = state.onSnapshotListeners.filter((entry) => entry !== listener);
      };
    },
    writeBatch: () => {
      const operations = [];
      const batch = {
        set: (ref, data, options = {}) => {
          operations.push({ type: "set", ref, data: clone(data), options: { ...options } });
        },
        commit: async () => {
          operations.forEach((operation) => {
            if (operation.type === "set") {
              const existing = state.docs.get(operation.ref.path)?.data ?? {};
              const next = operation.options.merge
                ? applyUpdate(existing, operation.data)
                : clone(operation.data);
              state.docs.set(operation.ref.path, { data: next, updateTime: Date.now() });
              state.setDocCalls.push({
                ref: operation.ref,
                data: clone(operation.data),
                options: { ...operation.options, fromBatch: true },
                result: clone(next),
              });
            }
          });
          state.writeBatches.push({ operations: clone(operations) });
        },
      };
      return batch;
    },
  };

  return { db, module, state };
};

export { createFirestoreModule };
