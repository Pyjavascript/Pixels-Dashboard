import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useDashboardPersistence(dashboardId) {
  const [gadgets, setGadgets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch gadgets for the active dashboard
  useEffect(() => {
    if (!dashboardId) return;

    async function loadGadgets() {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboard_gadgets")
        .select("*")
        .eq("dashboard_id", dashboardId)
        .order("position", { ascending: true });

      if (error) {
        console.error("Error loading gadgets:", error.message);
      } else {
        setGadgets(data || []);
      }
      setLoading(false);
    }

    loadGadgets();
  }, [dashboardId]);

  // Persist gadget configuration changes to Supabase
  const updateGadgetConfig = async (gadgetId, newConfig) => {
    // Optimistic UI update
    setGadgets((prev) =>
      prev.map((g) => (g.id === gadgetId ? { ...g, configuration: newConfig } : g))
    );

    const { error } = await supabase
      .from("dashboard_gadgets")
      .update({ configuration: newConfig, updated_at: new Date().toISOString() })
      .eq("id", gadgetId);

    if (error) {
      console.error("Error saving gadget configuration:", error.message);
    }
  };

  return { gadgets, loading, updateGadgetConfig };
}