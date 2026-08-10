import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role klient — POUZE pro serverový kód (API routes).
// Nikdy neimportovat do klientských komponent.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
