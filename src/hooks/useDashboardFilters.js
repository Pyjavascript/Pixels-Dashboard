import { createContext, useContext, useState } from "react";

const DashboardFilterContext = createContext();

export function DashboardFilterProvider({ children }) {
  const [filters, setFilters] = useState({
    projectId: "all",
    sprintId: "all",
    assigneeId: "all",
    status: "all",
    priority: "all",
    dateRange: "30days",
  });

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      projectId: "all",
      sprintId: "all",
      assigneeId: "all",
      status: "all",
      priority: "all",
      dateRange: "30days",
    });
  };

  return (
    <DashboardFilterContext.Provider value={{ filters, updateFilter, clearFilters }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  return useContext(DashboardFilterContext);
}