import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // or your framework's router hook
import { supabase } from "../lib/supabase";
import ClientPortal from "./ClientPortal"; // Import your ClientPortal component
import { differenceInDays, parseISO } from "date-fns";

export default function ClientPage() {
  const { slug } = useParams(); // Grabs the project slug from the URL
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectData = async () => {
    setLoading(true);
    // Fetch only the specific project matching the slug
    const { data: projData, error } = await supabase
      .from("projects")
      .select("*, tasks(*), milestones(*), deliverables(*)")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error("Error fetching client project:", error.message);
    } else {
      setProject(projData);
    }

    // Fetch team members so the @ mention feature works in the request modal
    const { data: empData } = await supabase.from("employees").select("*");
    if (empData) setEmployees(empData);

    setLoading(false);
  };

  useEffect(() => {
    if (slug) fetchProjectData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center text-xs text-[#787774]">
        Loading client portal...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center text-xs text-rose-600 font-semibold">
        Project not found or link is invalid.
      </div>
    );
  }

  // Calculate days remaining until launch date
  const daysRemaining = project.launch_date
    ? differenceInDays(parseISO(project.launch_date), new Date())
    : 0;

  return (
    <div className="min-h-screen bg-[#faf9f5] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Renders ONLY the Client Portal view with zero admin nav or controls */}
        <ClientPortal
          project={project}
          employees={employees}
          daysRemaining={daysRemaining}
          onRefresh={fetchProjectData}
        />
      </div>
    </div>
  );
}