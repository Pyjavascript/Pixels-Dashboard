import { supabase } from "../lib/supabase";

/**
 * Log an action to the activity_logs table
 */
export async function logActivity(projectId, taskId, action, metadata = {}) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      project_id: projectId || null,
      task_id: taskId || null,
      action,
      metadata,
    });
    if (error) throw error;
  } catch (err) {
    console.error("Error logging activity:", err.message);
  }
}

/**
 * Create a global or project notification alert
 */
export async function sendNotification(title, message, type = "info") {
  try {
    const { error } = await supabase.from("notifications").insert({
      title,
      message,
      type,
      is_read: false,
    });
    if (error) throw error;
  } catch (err) {
    console.error("Error sending notification:", err.message);
  }
}