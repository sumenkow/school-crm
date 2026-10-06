/**
 * In-memory test environment setup for Node.js
 */

export function setupTestEnv() {
  const store = new Map<string, string>();

  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };

  const listeners = new Map<string, Array<(...args: any[]) => void>>();

  const windowMock: any = {
    localStorage: localStorageMock,
    addEventListener: (event: string, cb: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
    },
    removeEventListener: (event: string, cb: (...args: any[]) => void) => {
      const arr = listeners.get(event) || [];
      listeners.set(event, arr.filter((fn) => fn !== cb));
    },
    dispatchEvent: (ev: any) => {
      const type = ev?.type;
      if (!type) return true;
      const arr = listeners.get(type) || [];
      for (const fn of arr) {
        fn(ev);
      }
      return true;
    },
  };

  class CustomEventMock {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  }

  (global as any).window = windowMock;
  (global as any).localStorage = localStorageMock;
  (global as any).CustomEvent = CustomEventMock;
  (global as any).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, success: true, result: { message_id: 101, username: 'youeuropeservicebot' } }),
    text: async () => JSON.stringify({ ok: true, success: true, result: { message_id: 101, username: 'youeuropeservicebot' } }),
  });

  return {
    store,
    clear: () => store.clear(),
  };
}
