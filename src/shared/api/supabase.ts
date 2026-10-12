import { createClient } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";

export const supabase = createClient(env.supabase.url, env.supabase.anonKey);
