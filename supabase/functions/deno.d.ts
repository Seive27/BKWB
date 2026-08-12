/**
 * Editor-only ambient types for Supabase Edge Functions.
 * These files run on Deno; the workspace TypeScript server does not.
 */

declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
    function set(key: string, value: string): void;
    function toObject(): Record<string, string>;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'npm:@supabase/supabase-js@2' {
  type QueryResult<T = any> = Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;

  interface QueryBuilder {
    select(columns?: string): QueryBuilder;
    insert(values: unknown): QueryBuilder;
    update(values: unknown): QueryBuilder;
    eq(column: string, value: unknown): QueryBuilder;
    maybeSingle(): QueryResult;
    then: Promise<{ data: any; error: { message: string } | null }>['then'];
  }

  interface SupabaseClient {
    auth: {
      getUser(token?: string): Promise<{
        data: { user: { id: string } | null };
        error: { message: string } | null;
      }>;
      admin: {
        createUser(attrs: Record<string, unknown>): Promise<{
          data: { user: { id: string } };
          error: { message: string } | null;
        }>;
        deleteUser(id: string): Promise<{ error: { message: string } | null }>;
      };
    };
    from(table: string): QueryBuilder;
    rpc(fn: string, args?: unknown): QueryResult;
    functions: {
      invoke(name: string, options?: unknown): Promise<unknown>;
    };
  }

  export function createClient(
    url: string,
    key: string,
    options?: unknown,
  ): SupabaseClient;
}

declare module 'npm:@supabase/supabase-js@2/cors' {
  export const corsHeaders: Record<string, string>;
}
