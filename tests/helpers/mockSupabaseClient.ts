export function createClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
      upsert: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
    }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
