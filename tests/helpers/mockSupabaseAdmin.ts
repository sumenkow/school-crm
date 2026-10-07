/**
 * Mock Supabase Admin Client for testing Next.js API route handlers.
 * Allows setting configurable handlers per test case to simulate specific
 * database behaviors (PGRST204, 23503, profiles queries, successful upserts, etc.)
 */

export interface MockSupabaseTableQuery {
  upsert?: (row: any, options?: any) => Promise<{ data: any; error: any }>;
  update?: (row: any) => { eq: (col: string, val: any) => Promise<{ data: any; error: any }> };
  select?: (cols: string) => any;
}

export type TableHandler = (tableName: string) => MockSupabaseTableQuery;

let customTableHandler: TableHandler | null = null;

export function setMockAdminHandler(handler: TableHandler | null) {
  customTableHandler = handler;
}

export function createAdminClient() {
  return {
    from: (tableName: string) => {
      if (customTableHandler) {
        return customTableHandler(tableName);
      }
      return {
        upsert: async () => ({ data: null, error: null }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
        select: () => ({
          ilike: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          order: () => ({ data: [], error: null }),
        }),
      };
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
