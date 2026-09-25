import { supabase } from "../lib/supabase";

export async function fetchDashboardGadgets(dashboardId) {
  const { data, error } = await supabase
    .from("dashboard_gadgets")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

export async function saveGadgetConfiguration(gadgetId, configuration) {
  const { error } = await supabase
    .from("dashboard_gadgets")
    .update({ configuration, updated_at: new Date().toISOString() })
    .eq("id", gadgetId);

  if (error) throw error;
}

export async function updateGadgetPosition(gadgetId, position, row, col) {
  const { error } = await supabase
    .from("dashboard_gadgets")
    .update({ position, row, column: col, updated_at: new Date().toISOString() })
    .eq("id", gadgetId);

  if (error) throw error;
}