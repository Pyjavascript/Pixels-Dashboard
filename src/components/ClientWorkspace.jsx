import React from "react";
import ProjectDashboard from "./ProjectDashboard";
import ClientLibrary from "./ClientLibrary";

export default function ClientWorkspace({
  project,
  employees = [],
  daysRemaining,
  onRefresh,
  view,
  onViewChange,
  highlightTaskId,
  onSeeAsClient,
}) {
  if (view === "documents") {
    return <ClientLibrary project={project} onRefresh={onRefresh} mode="documents" />;
  }

  if (view === "library") {
    return <ClientLibrary project={project} onRefresh={onRefresh} mode="deliverables" />;
  }

  return (
    <ProjectDashboard
      project={project}
      employees={employees}
      daysRemaining={daysRemaining}
      onRefresh={onRefresh}
      activeView={view}
      onViewChange={onViewChange}
      showImportantLinks={false}
    />
  );
}