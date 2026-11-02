
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { supabase } from "../lib/supabase";
// import {
//   addDays,
//   differenceInCalendarDays,
//   format,
//   isBefore,
//   isSameDay,
//   isWeekend,
//   max as maxDate,
//   min as minDate,
// } from "date-fns";
// import {
//   Pause,
//   Play,
//   Loader2,
//   ChevronLeft,
//   ChevronRight,
//   CalendarDays,
//   Search,
//   X,
//   CalendarSearch,
//   SearchX,
// } from "lucide-react";

// const DAY_WIDTH = 84; // px per day column
// const ROW_HEIGHT = 60; // px per project row
// const BAR_HEIGHT = 34;
// const HEADER_HEIGHT = 44;
// const MONTH_HEADER_HEIGHT = 28;

// // Color assigned by tier so rows read as swimlanes, like the reference board.
// // Each tier now carries a two-stop gradient + a matching glow color for hover states.
// const TIER_STYLES = {
//   Startup: {
//     bar: "from-violet-500 to-violet-600",
//     chip: "bg-violet-500",
//     ring: "ring-violet-200",
//     glow: "shadow-violet-500/30",
//   },
//   Business: {
//     bar: "from-teal-500 to-teal-600",
//     chip: "bg-teal-500",
//     ring: "ring-teal-200",
//     glow: "shadow-teal-500/30",
//   },
//   Enterprise: {
//     bar: "from-emerald-500 to-emerald-600",
//     chip: "bg-emerald-500",
//     ring: "ring-emerald-200",
//     glow: "shadow-emerald-500/30",
//   },
//   "On Hold": {
//     bar: "from-amber-500 to-amber-600",
//     chip: "bg-amber-500",
//     ring: "ring-amber-200",
//     glow: "shadow-amber-500/30",
//   }
// };
// const DEFAULT_STYLE = {
//   bar: "from-amber-500 to-amber-600",
//   chip: "bg-amber-500",
//   ring: "ring-amber-200",
//   glow: "shadow-amber-500/30",
// };

// function tierStyle(tier) {
//   return TIER_STYLES[tier] || DEFAULT_STYLE;
// }

// function parseDate(value) {
//   if (!value) return null;
//   const d = new Date(value + "T00:00:00");
//   return isNaN(d.getTime()) ? null : d;
// }

// export default function ProjectsTimelineTab({ projects, onRefresh }) {
//   const [updatingId, setUpdatingId] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterDate, setFilterDate] = useState(""); // yyyy-mm-dd from <input type="date">
//   const scrollRef = useRef(null);
//   const searchInputRef = useRef(null);

//   const rows = useMemo(() => {
//     return projects
//       .map((p) => {
//         const start = parseDate(p.start_date) || parseDate(p.launch_date);
//         if (!start) return null;
//         const explicitEnd = parseDate(p.end_date);
//         const end = explicitEnd || addDays(start, 14);
//         return {
//           project: p,
//           start,
//           end: isBefore(end, start) ? addDays(start, 1) : end,
//           estimated: !explicitEnd,
//         };
//       })
//       .filter(Boolean);
//   }, [projects]);

//   const { rangeStart, days, totalDays } = useMemo(() => {
//     const today = new Date();
//     if (rows.length === 0) {
//       const rStart = addDays(today, -7);
//       const total = 45;
//       return {
//         rangeStart: rStart,
//         days: Array.from({ length: total }, (_, i) => addDays(rStart, i)),
//         totalDays: total,
//       };
//     }
//     const starts = rows.map((r) => r.start);
//     const ends = rows.map((r) => r.end);
//     // pad a few days on either side so bars never touch the edge
//     const rStart = addDays(minDate([...starts, today]), -3);
//     const rEnd = addDays(maxDate(ends), 5);
//     const total = differenceInCalendarDays(rEnd, rStart) + 1;
//     return {
//       rangeStart: rStart,
//       days: Array.from({ length: total }, (_, i) => addDays(rStart, i)),
//       totalDays: total,
//     };
//   }, [rows]);

//   // Group the day columns into month bands for the sticky header.
//   const monthBands = useMemo(() => {
//     const bands = [];
//     for (const d of days) {
//       const key = format(d, "MMM yyyy");
//       const last = bands[bands.length - 1];
//       if (last && last.key === key) {
//         last.count += 1;
//       } else {
//         bands.push({ key, label: format(d, "MMMM yyyy"), count: 1 });
//       }
//     }
//     return bands;
//   }, [days]);

//   const todayOffset = differenceInCalendarDays(new Date(), rangeStart);
//   const timelineWidth = totalDays * DAY_WIDTH;

//   const normalizedQuery = searchQuery.trim().toLowerCase();
//   const filterDateObj = filterDate ? parseDate(filterDate) : null;

//   const filteredRows = useMemo(() => {
//     return rows.filter(({ project, start, end }) => {
//       const matchesName =
//         !normalizedQuery || project.title?.toLowerCase().includes(normalizedQuery);
//       const matchesDate =
//         !filterDateObj ||
//         (!isBefore(filterDateObj, start) && !isBefore(end, filterDateObj));
//       return matchesName && matchesDate;
//     });
//   }, [rows, normalizedQuery, filterDateObj]);

//   const hasActiveFilters = Boolean(normalizedQuery || filterDate);
//   const noResults = hasActiveFilters && filteredRows.length === 0 && rows.length > 0;

//   const clearFilters = () => {
//     setSearchQuery("");
//     setFilterDate("");
//   };

//   const scrollByWeek = (dir) => {
//     scrollRef.current?.scrollBy({ left: dir * DAY_WIDTH * 7, behavior: "smooth" });
//   };

//   const scrollToOffset = (offsetDays) => {
//     const el = scrollRef.current;
//     if (!el) return;
//     el.scrollTo({
//       left: Math.max(offsetDays * DAY_WIDTH - el.clientWidth / 2, 0),
//       behavior: "smooth",
//     });
//   };

//   const scrollToToday = () => scrollToOffset(todayOffset);

//   // Whenever a name or date filter narrows things down to a match, glide the
//   // timeline to the earliest matching bar so the user doesn't have to hunt.
//   useEffect(() => {
//     if (!hasActiveFilters || filteredRows.length === 0) return;
//     const earliest = filteredRows.reduce((acc, r) => (isBefore(r.start, acc.start) ? r : acc));
//     const offset = differenceInCalendarDays(
//       filterDateObj || earliest.start,
//       rangeStart
//     );
//     scrollToOffset(offset);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [normalizedQuery, filterDate]);

//   const handleToggleHold = async (project) => {
//     const nextStatus = project.status === "On Hold" ? "In Progress" : "On Hold";
//     setUpdatingId(project.id);
//     const { error } = await supabase
//       .from("projects")
//       .update({ status: nextStatus })
//       .eq("id", project.id);
//     setUpdatingId(null);
//     if (error) {
//       alert("Failed to update status: " + error.message);
//       return;
//     }
//     onRefresh();
//   };

//   return (
//     <div className="space-y-3">
//       {/* Toolbar */}
//       <div className="flex flex-wrap items-center justify-between gap-2">
//         <div className="flex items-center gap-1">
//           <button
//             type="button"
//             onClick={scrollToToday}
//             className="h-8 px-3 rounded-lg border border-[#e9e9e7] bg-white text-xs font-semibold text-[#37352f] hover:bg-[#fafafa] flex items-center gap-1.5 transition-colors"
//           >
//             <CalendarDays className="h-3.5 w-3.5" />
//             Today
//           </button>
//           <button
//             type="button"
//             onClick={() => scrollByWeek(-1)}
//             className="h-8 w-8 rounded-lg border border-[#e9e9e7] bg-white text-[#787774] hover:bg-[#fafafa] flex items-center justify-center transition-colors"
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </button>
//           <button
//             type="button"
//             onClick={() => scrollByWeek(1)}
//             className="h-8 w-8 rounded-lg border border-[#e9e9e7] bg-white text-[#787774] hover:bg-[#fafafa] flex items-center justify-center transition-colors"
//           >
//             <ChevronRight className="h-4 w-4" />
//           </button>

//           <span className="ml-2 text-xs font-semibold text-[#9b9a97]">
//             {format(rangeStart, "MMM yyyy")} – {format(days[days.length - 1], "MMM yyyy")}
//           </span>
//         </div>

//         <div className="flex items-center gap-2">
//           {/* Jump to date */}
//           <label className="relative flex items-center h-8 rounded-lg border border-[#e9e9e7] bg-white pl-2.5 pr-2 text-[#787774] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
//             <CalendarSearch className="h-3.5 w-3.5 shrink-0" />
//             <input
//               type="date"
//               value={filterDate}
//               onChange={(e) => setFilterDate(e.target.value)}
//               className="ml-1.5 h-full bg-transparent text-xs font-medium text-[#37352f] outline-none w-[124px]"
//             />
//           </label>

//           {/* Search by name */}
//           <label className="relative flex items-center h-8 rounded-lg border border-[#e9e9e7] bg-white pl-2.5 pr-2 text-[#787774] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
//             <Search className="h-3.5 w-3.5 shrink-0" />
//             <input
//               ref={searchInputRef}
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search projects…"
//               className="ml-1.5 h-full bg-transparent text-xs font-medium text-[#37352f] outline-none w-[140px] placeholder:text-[#9b9a97]"
//             />
//             {searchQuery && (
//               <button
//                 type="button"
//                 onClick={() => setSearchQuery("")}
//                 className="ml-1 rounded-full p-0.5 hover:bg-[#f1f1ef] shrink-0"
//               >
//                 <X className="h-3 w-3" />
//               </button>
//             )}
//           </label>

//           {hasActiveFilters && (
//             <button
//               type="button"
//               onClick={clearFilters}
//               className="h-8 px-2.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
//             >
//               Clear
//             </button>
//           )}
//         </div>
//       </div>

//       {hasActiveFilters && !noResults && (
//         <div className="text-[11px] font-medium text-[#9b9a97] px-0.5">
//           Showing {filteredRows.length} of {rows.length} project
//           {rows.length === 1 ? "" : "s"}
//         </div>
//       )}

//       <div className="border border-[#e9e9e7] rounded-xl bg-white overflow-hidden shadow-sm">
//         <div ref={scrollRef} className="overflow-x-auto">
//           <div style={{ width: timelineWidth, minWidth: "100%" }}>
//             {/* Month band */}
//             <div
//               className="flex sticky top-0 z-30 bg-white border-b border-[#f1f1ef]"
//               style={{ height: MONTH_HEADER_HEIGHT }}
//             >
//               {monthBands.map((band, i) => (
//                 <div
//                   key={`${band.key}-${i}`}
//                   className="flex items-center px-2.5 text-[11px] font-bold uppercase tracking-wide text-[#787774] border-r border-[#f1f1ef] shrink-0"
//                   style={{ width: band.count * DAY_WIDTH }}
//                 >
//                   {band.label}
//                 </div>
//               ))}
//             </div>

//             {/* Day header */}
//             <div
//               className="flex sticky z-20 bg-white"
//               style={{ height: HEADER_HEIGHT, top: MONTH_HEADER_HEIGHT }}
//             >
//               {days.map((d) => {
//                 const today = isSameDay(d, new Date());
//                 const isFilterDay = filterDateObj && isSameDay(d, filterDateObj);
//                 return (
//                   <div
//                     key={d.toISOString()}
//                     className={`flex flex-col items-center justify-center border-b border-r border-[#f1f1ef] text-[11px] shrink-0 transition-colors ${
//                       isFilterDay ? "bg-blue-50" : isWeekend(d) ? "bg-[#fafafa]" : "bg-white"
//                     }`}
//                     style={{ width: DAY_WIDTH }}
//                   >
//                     <span className="text-[#9b9a97] font-medium uppercase tracking-wide">
//                       {format(d, "EEE")}
//                     </span>
//                     <span
//                       className={`mt-0.5 font-bold ${
//                         today
//                           ? "h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[11px] shadow-sm shadow-blue-500/40"
//                           : isFilterDay
//                           ? "h-5 w-5 rounded-full border-2 border-blue-500 text-blue-600 flex items-center justify-center text-[11px]"
//                           : "text-[#37352f]"
//                       }`}
//                     >
//                       {format(d, "d")}
//                     </span>
//                   </div>
//                 );
//               })}
//             </div>

//             {/* Body */}
//             <div className="relative">
//               {/* weekend column shading */}
//               <div className="absolute inset-0 flex pointer-events-none">
//                 {days.map((d) => (
//                   <div
//                     key={d.toISOString()}
//                     className={`border-r border-[#f1f1ef] shrink-0 ${
//                       isWeekend(d) ? "bg-[#fafafa]" : ""
//                     } ${filterDateObj && isSameDay(d, filterDateObj) ? "bg-blue-50/60" : ""}`}
//                     style={{ width: DAY_WIDTH }}
//                   />
//                 ))}
//               </div>

//               {/* today line */}
//               {todayOffset >= 0 && todayOffset < totalDays && (
//                 <div
//                   className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/80 via-blue-500/50 to-blue-500/80 z-10"
//                   style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
//                 />
//               )}

//               {noResults ? (
//                 <div className="relative py-14 flex flex-col items-center justify-center gap-2 text-center">
//                   <SearchX className="h-6 w-6 text-[#c9c8c4]" />
//                   <p className="text-xs font-semibold text-[#37352f]">No matching projects</p>
//                   <p className="text-[11px] text-[#9b9a97]">
//                     Try a different name or date.
//                   </p>
//                   <button
//                     type="button"
//                     onClick={clearFilters}
//                     className="mt-1 h-7 px-3 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
//                   >
//                     Clear filters
//                   </button>
//                 </div>
//               ) : rows.length === 0 ? (
//                 <div className="relative py-10 text-center text-xs text-[#9b9a97]">
//                   No projects with a start date yet.
//                 </div>
//               ) : (
//                 filteredRows.map(({ project, start, end, estimated }) => {
//                   const offset = differenceInCalendarDays(start, rangeStart) * DAY_WIDTH;
//                   const width = Math.max(
//                     (differenceInCalendarDays(end, start) + 1) * DAY_WIDTH,
//                     DAY_WIDTH
//                   );
//                   const isHold = project.status === "On Hold";
//                   const isUpdating = updatingId === project.id;
//                   const style = tierStyle(project.tier);
//                   const durationDays = differenceInCalendarDays(end, start) + 1;
//                   const showSubtitle = width > 160;

//                   return (
//                     <div
//                       key={project.id}
//                       className="relative group hover:bg-blue-50/30 transition-colors"
//                       style={{ height: ROW_HEIGHT }}
//                     >
//                       <div
//                         className={`absolute top-1/2 -translate-y-1/2 rounded-lg px-3 flex items-center gap-2 text-white bg-gradient-to-r shadow-md transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-[calc(50%+2px)] ${style.bar} ${style.glow} ${
//                           isHold ? "opacity-55 border-2 border-dashed border-white" : ""
//                         }`}
//                         style={{ left: offset, width, height: BAR_HEIGHT }}
//                         title={`${format(start, "MMM d")} → ${format(end, "MMM d")}${
//                           estimated ? " (estimated end)" : ""
//                         }`}
//                       >
//                         {project.icon ? (
//                           <img
//                             src={project.icon}
//                             alt=""
//                             className="h-4 w-4 rounded object-contain shrink-0 bg-white/40"
//                           />
//                         ) : (
//                           <span
//                             className={`h-4 w-4 rounded-full shrink-0 ${style.chip} ring-2 ring-white/50`}
//                           />
//                         )}
//                         <span className="flex flex-col leading-tight min-w-0 flex-1">
//                           <span className="text-[11px] font-semibold truncate">
//                             {project.title}
//                           </span>
//                           {showSubtitle && (
//                             <span className="text-[9.5px] font-medium text-white/75 truncate">
//                               {format(start, "MMM d")} → {format(end, "MMM d")} · {durationDays}d
//                               {estimated ? " · est." : ""}
//                             </span>
//                           )}
//                         </span>
//                         <button
//                           type="button"
//                           onClick={() => handleToggleHold(project)}
//                           disabled={isUpdating}
//                           className="shrink-0 h-5 w-5 rounded-md bg-white/25 hover:bg-white/40 flex items-center justify-center transition"
//                           title={isHold ? "Resume project" : "Hold project"}
//                         >
//                           {isUpdating ? (
//                             <Loader2 className="h-3 w-3 animate-spin" />
//                           ) : isHold ? (
//                             <Play className="h-3 w-3" />
//                           ) : (
//                             <Pause className="h-3 w-3" />
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Legend */}
//       <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#787774]">
//         {Object.entries(TIER_STYLES).map(([label, s]) => (
//           <span key={label} className="flex items-center gap-1.5">
//             <span className={`h-2.5 w-2.5 rounded-full ${s.chip}`} />
//             {label}
//           </span>
//         ))}
//         <span className="flex items-center gap-1.5">
//           <span className={`h-2.5 w-2.5 rounded-full ${DEFAULT_STYLE.chip}`} />
//           Other
//         </span>
//         <span className="flex items-center gap-1.5">
//           <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-[#9b9a97]" />
//           On hold
//         </span>
//       </div>
//     </div>
//   );
// }

import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { addDays, format, isBefore } from "date-fns";
import {
  Pause,
  Play,
  Loader2,
  Search,
  X,
  CalendarSearch,
  SearchX,
} from "lucide-react";

const TIER_STYLES = {
  Startup: { chip: "bg-violet-500" },
  Business: { chip: "bg-teal-500" },
  Enterprise: { chip: "bg-emerald-500" },
  "On Hold": { chip: "bg-amber-500" },
};
const DEFAULT_STYLE = { chip: "bg-amber-500" };

function tierStyle(tier) {
  return TIER_STYLES[tier] || DEFAULT_STYLE;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export default function ProjectsTimelineTab({ projects, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState(""); // yyyy-mm-dd

  const rows = useMemo(() => {
    return projects
      .map((p) => {
        const start = parseDate(p.start_date) || parseDate(p.launch_date);
        if (!start) return null;
        const explicitEnd = parseDate(p.end_date);
        const end = explicitEnd || addDays(start, 14);
        return {
          project: p,
          start,
          end: isBefore(end, start) ? addDays(start, 1) : end,
          estimated: !explicitEnd,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  }, [projects]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filterDateObj = filterDate ? parseDate(filterDate) : null;

  const filteredRows = useMemo(() => {
    return rows.filter(({ project, start, end }) => {
      const matchesName =
        !normalizedQuery || project.title?.toLowerCase().includes(normalizedQuery);
      const matchesDate =
        !filterDateObj ||
        (!isBefore(filterDateObj, start) && !isBefore(end, filterDateObj));
      return matchesName && matchesDate;
    });
  }, [rows, normalizedQuery, filterDateObj]);

  const hasActiveFilters = Boolean(normalizedQuery || filterDate);
  const noResults = hasActiveFilters && filteredRows.length === 0 && rows.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDate("");
  };

  const handleToggleHold = async (project) => {
    const nextStatus = project.status === "On Hold" ? "In Progress" : "On Hold";
    setUpdatingId(project.id);
    const { error } = await supabase
      .from("projects")
      .update({ status: nextStatus })
      .eq("id", project.id);
    setUpdatingId(null);
    if (error) {
      alert("Failed to update status: " + error.message);
      return;
    }
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="relative flex items-center h-8 rounded-lg border border-[#e9e9e7] bg-white pl-2.5 pr-2 text-[#787774] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
          <CalendarSearch className="h-3.5 w-3.5 shrink-0" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="ml-1.5 h-full bg-transparent text-xs font-medium text-[#37352f] outline-none w-[124px]"
          />
        </label>

        <label className="relative flex items-center h-8 rounded-lg border border-[#e9e9e7] bg-white pl-2.5 pr-2 text-[#787774] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects…"
            className="ml-1.5 h-full bg-transparent text-xs font-medium text-[#37352f] outline-none w-[140px] placeholder:text-[#9b9a97]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="ml-1 rounded-full p-0.5 hover:bg-[#f1f1ef] shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {hasActiveFilters && !noResults && (
        <div className="text-[11px] font-medium text-[#9b9a97] px-0.5">
          Showing {filteredRows.length} of {rows.length} project
          {rows.length === 1 ? "" : "s"}
        </div>
      )}

      {/* List */}
      <div className="border border-[#e9e9e7] rounded-xl bg-white overflow-hidden shadow-sm divide-y divide-[#f1f1ef]">
        {noResults ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-center">
            <SearchX className="h-6 w-6 text-[#c9c8c4]" />
            <p className="text-xs font-semibold text-[#37352f]">No matching projects</p>
            <p className="text-[11px] text-[#9b9a97]">Try a different name or date.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-1 h-7 px-3 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#9b9a97]">
            No projects with a start date yet.
          </div>
        ) : (
          filteredRows.map(({ project, start, end, estimated }) => {
            const isHold = project.status === "On Hold";
            const isUpdating = updatingId === project.id;
            const style = tierStyle(project.tier);

            return (
              <div
                key={project.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors ${
                  isHold ? "opacity-60" : ""
                }`}
              >
                {project.icon ? (
                  <img
                    src={project.icon}
                    alt=""
                    className="h-7 w-7 rounded-md object-contain shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {project.title?.charAt(0) || "P"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#37352f] truncate">
                    {project.title}
                  </p>
                  <p className="text-[11px] text-[#787774] truncate">
                    {project.client_name}
                  </p>
                </div>

                <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#787774] shrink-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.chip}`} />
                  {project.tier || "Startup"}
                </span>

                <span className="hidden md:block text-xs text-[#787774] shrink-0 w-[150px] text-right">
                  {format(start, "MMM d")} → {format(end, "MMM d")}
                  {estimated ? " · est." : ""}
                </span>

                {isHold && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shrink-0">
                    On hold
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleHold(project)}
                  disabled={isUpdating}
                  className="shrink-0 h-7 w-7 rounded-md border border-[#e9e9e7] text-[#787774] hover:bg-[#fafafa] flex items-center justify-center transition"
                  title={isHold ? "Resume project" : "Hold project"}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isHold ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}