import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";

export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey);
