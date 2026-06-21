import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export async function getCurrentRoles(): Promise<AppRole[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  return (data ?? []).map((r) => r.role as AppRole);
}

export async function ensureRole(role: AppRole) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const existing = await getCurrentRoles();
  if (existing.includes(role)) return;
  const { error } = await supabase.from("user_roles").insert({ user_id: u.user.id, role });
  if (error) throw error;
}
