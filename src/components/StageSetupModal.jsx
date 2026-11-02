// import React, { useState } from "react";
// import { X, Copy, Check, ExternalLink, FileSpreadsheet, Code2, ArrowRight, Loader2, Sparkles } from "lucide-react";

// export default function StageSetupModal({ isOpen, onClose, onSave, initialData, projectId }) {
//   const [step, setStep] = useState(1); // 1: Details, 2: Google Sheets Sync Guide
//   const [title, setTitle] = useState(initialData?.title || "");
//   const [dueDate, setDueDate] = useState(initialData?.due_date || "");
//   const [sheetUrl, setSheetUrl] = useState(initialData?.sheet_url || "");
//   const [completed, setCompleted] = useState(initialData?.status === "complete" || false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [copied, setCopied] = useState(false);

//   // Generate or use existing stage ID for the Apps Script snippet
//   const stageId = initialData?.id || "5b0de1b1-b43f-4005-a7b3-4808e372aecb";

//   const SUPABASE_URL = "https://sswmmuukzbsuvzicujey.supabase.co/rest/v1/milestones";
//   const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzd21tdXVremJzdXZ6aWN1amV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NTQ3OCwiZXhwIjoyMTAzMTQxNDc4fQ.RGbwWU-C3g1WomP6vM_MnL5YgX2J9TmYlEhIx5WCcFU";

//   const generatedScript = `const SUPABASE_URL = "${SUPABASE_URL}";
// const SUPABASE_KEY = "${SUPABASE_KEY}";

// function syncProgressToSupabase(e) {
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
//   // Linked automatically to stage: ${title || "Untitled Stage"}
//   const stageId = '${stageId}';
//   const currentProgress = sheet.getRange("B1").getValue();
  
//   if (!stageId || currentProgress === "") return;

//   const props = PropertiesService.getDocumentProperties();
//   const lastProgress = props.getProperty('lastProgress_' + stageId);
  
//   if (currentProgress.toString() !== lastProgress) {
//     const url = \`\${SUPABASE_URL}?id=eq.\${stageId}\`;
//     const options = {
//       method: "patch",
//       headers: {
//         "apikey": SUPABASE_KEY,
//         "Authorization": \`Bearer \${SUPABASE_KEY}\`,
//         "Content-Type": "application/json",
//         "Prefer": "return=minimal"
//       },
//       payload: JSON.stringify({ sheet_progress: parseInt(currentProgress, 10) }),
//       muteHttpExceptions: true
//     };
    
//     const response = UrlFetchApp.fetch(url, options);
//     if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
//       props.setProperty('lastProgress_' + stageId, currentProgress.toString());
//     }
//   }
// }`;

//   const handleCopyScript = () => {
//     navigator.clipboard.writeText(generatedScript);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2500);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!title.trim()) return;
//     setIsSaving(true);
//     await onSave({
//       title: title.trim(),
//       due_date: dueDate || "TBD",
//       sheet_url: sheetUrl.trim() || null,
//       status: completed ? "complete" : "pending",
//       sheet_progress: completed ? 100 : 0,
//     });
//     setIsSaving(false);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
//       <div className="w-full max-w-xl bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90dvh]">
        
//         {/* Modal Header */}
//         <div className="flex items-center justify-between pb-4 border-b border-[#e9e9e7]">
//           <div>
//             <h2 className="text-base font-bold text-[#37352f]">
//               {initialData ? "Edit Stage & Sheet Sync" : "Create Stage & Sync Google Sheet"}
//             </h2>
//             <p className="text-xs text-[#787774]">
//               {step === 1 ? "Step 1: Stage details & timeline" : "Step 2: Live Google Sheets automation"}
//             </p>
//           </div>
//           <button onClick={onClose} className="p-1.5 rounded-lg text-[#787774] hover:bg-[#f4f4f5]">
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         {/* Step Indicator Tabs */}
//         <div className="flex items-center gap-2 py-3 border-b border-[#f0f0ec] text-xs font-medium text-[#787774]">
//           <button 
//             type="button" 
//             onClick={() => setStep(1)}
//             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${step === 1 ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50"}`}
//           >
//             <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
//             Stage Info
//           </button>
//           <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
//           <button 
//             type="button" 
//             onClick={() => setStep(2)}
//             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${step === 2 ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50"}`}
//           >
//             <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">2</span>
//             Google Sheets Sync
//           </button>
//         </div>

//         {/* Modal Body */}
//         <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
//           {step === 1 ? (
//             <div className="space-y-4">
//               <div>
//                 <label className="block font-semibold text-[#37352f] mb-1">Stage Title *</label>
//                 <input
//                   required
//                   placeholder="e.g. Wireframes & UX Research"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] outline-none focus:border-blue-600"
//                 />
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                 <div>
//                   <label className="block font-semibold text-[#37352f] mb-1">Due Date</label>
//                   <input
//                     type="date"
//                     value={dueDate}
//                     onChange={(e) => setDueDate(e.target.value)}
//                     className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
//                   />
//                 </div>
//                 <div>
//                   <label className="block font-semibold text-[#37352f] mb-1">Google Sheet URL (Optional)</label>
//                   <input
//                     type="url"
//                     placeholder="https://docs.google.com/spreadsheets/..."
//                     value={sheetUrl}
//                     onChange={(e) => setSheetUrl(e.target.value)}
//                     className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
//                   />
//                 </div>
//               </div>

//               <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] border border-[#e9e9e7]">
//                 <div>
//                   <span className="font-bold text-[#37352f] block">Mark Stage as Complete</span>
//                   <span className="text-[10px] text-[#787774]">Instantly sets progress to 100%</span>
//                 </div>
//                 <input
//                   type="checkbox"
//                   checked={completed}
//                   onChange={(e) => setCompleted(e.target.checked)}
//                   className="h-4 w-4 rounded border-gray-300 text-blue-600"
//                 />
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-blue-900">
//                 <div className="flex items-center gap-1.5 font-bold">
//                   <Sparkles className="h-4 w-4 text-blue-600" />
//                   <span>Automatic Progress Syncing</span>
//                 </div>
//                 <p className="text-[11px] leading-relaxed text-blue-800">
//                   Link any Google Sheet to this stage so that updating cell <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">B1</code> instantly syncs live progress back to your client dashboard!
//                 </p>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex items-center justify-between">
//                   <span className="font-bold text-[#37352f]">1. Copy Custom Apps Script</span>
//                   <button
//                     type="button"
//                     onClick={handleCopyScript}
//                     className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20201e] text-white font-semibold text-[11px] hover:bg-black transition"
//                   >
//                     {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
//                     {copied ? "Copied to Clipboard!" : "Copy Script"}
//                   </button>
//                 </div>
//                 <div className="relative">
//                   <pre className="p-3 bg-[#1e1e1e] text-[#d4d4d4] rounded-xl font-mono text-[10px] overflow-x-auto max-h-36">
//                     {generatedScript}
//                   </pre>
//                 </div>
//               </div>

//               <div className="space-y-2 pt-2 border-t border-[#e9e9e7]">
//                 <span className="font-bold text-[#37352f] block">2. Setup Instructions in Google Sheets:</span>
//                 <ul className="list-disc pl-4 space-y-1 text-[#787774] text-[11px]">
//                   <li>Open your Google Sheet and enter the completion percentage in cell <b>B1</b>.</li>
//                   <li>In the top menu, go to <b className="text-[#37352f]">Extensions &gt; Apps Script</b>.</li>
//                   <li>Paste the code above into the editor and click <b>Save</b> (floppy disk icon).</li>
//                   <li>Set up an <b>Edit Trigger</b> (`onEdit` or time-driven trigger) to call <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">syncProgressToSupabase</code> whenever cell B1 changes.</li>
//                 </ul>
//               </div>
//             </div>
//           )}

//           {/* Modal Footer */}
//           <div className="flex items-center justify-between pt-4 border-t border-[#e9e9e7]">
//             {step === 2 ? (
//               <button
//                 type="button"
//                 onClick={() => setStep(1)}
//                 className="px-3.5 py-1.5 rounded-lg border border-[#e9e9e7] bg-white font-semibold text-[#37352f]"
//               >
//                 Back
//               </button>
//             ) : <div />}

//             <div className="flex items-center gap-2">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-3.5 py-1.5 rounded-lg border border-[#e9e9e7] bg-white font-semibold text-[#37352f]"
//               >
//                 Cancel
//               </button>
//               {step === 1 ? (
//                 <button
//                   key="next"
//                   type="button"
//                   onClick={() => setStep(2)}
//                   className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1 hover:bg-blue-700 transition"
//                 >
//                   Next: Sheet Sync <ArrowRight className="h-3.5 w-3.5" />
//                 </button>
//               ) : (
//                 <button
//                   key="save"
//                   type="submit"
//                   disabled={isSaving}
//                   className="px-5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5 hover:bg-blue-700 transition shadow-xs"
//                 >
//                   {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
//                   Save Stage
//                 </button>
//               )}
//             </div>
//           </div>
//         </form>

//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import { X, Copy, Check, ExternalLink, FileSpreadsheet, Code2, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function StageSetupModal({ isOpen, onClose, onSave, initialData, projectId }) {
  const [step, setStep] = useState(1); // 1: Details, 2: Google Sheets Sync Guide
  const [title, setTitle] = useState(initialData?.title || "");
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [sheetUrl, setSheetUrl] = useState(initialData?.sheet_url || "");
  const [completed, setCompleted] = useState(initialData?.status === "complete" || false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [createdStage, setCreatedStage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [titleError, setTitleError] = useState(false);

  // Real stage ID: the existing stage, or the row created when moving to step 2
  const stageId = createdStage?.id || initialData?.id || "";

  // Reset the form every time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setTitle(initialData?.title || "");
    setDueDate(initialData?.due_date || "");
    setSheetUrl(initialData?.sheet_url || "");
    setCompleted(initialData?.status === "complete" || false);
    setCreatedStage(null);
    setTitleError(false);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const SUPABASE_URL = "https://sswmmuukzbsuvzicujey.supabase.co/rest/v1/milestones";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzd21tdXVremJzdXZ6aWN1amV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2NTQ3OCwiZXhwIjoyMTAzMTQxNDc4fQ.RGbwWU-C3g1WomP6vM_MnL5YgX2J9TmYlEhIx5WCcFU";

  const generatedScript = `const SUPABASE_URL = "${SUPABASE_URL}";
const SUPABASE_KEY = "${SUPABASE_KEY}";

function syncProgressToSupabase(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Linked automatically to stage: ${title || "Untitled Stage"}
  const stageId = '${stageId}';
  const currentProgress = sheet.getRange("B1").getValue();
  
  if (!stageId || currentProgress === "") return;

  const props = PropertiesService.getDocumentProperties();
  const lastProgress = props.getProperty('lastProgress_' + stageId);
  
  if (currentProgress.toString() !== lastProgress) {
    const url = \`\${SUPABASE_URL}?id=eq.\${stageId}\`;
    const options = {
      method: "patch",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": \`Bearer \${SUPABASE_KEY}\`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify({ sheet_progress: parseInt(currentProgress, 10) }),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      props.setProperty('lastProgress_' + stageId, currentProgress.toString());
    }
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Step 2 needs a real stage ID, so a new stage is created before moving on
  const goToSync = async () => {
    if (stageId) {
      setStep(2);
      return;
    }
    if (!title.trim()) {
      setTitleError(true);
      setStep(1);
      return;
    }
    setIsCreating(true);
    const created = await onSave(
      {
        title: title.trim(),
        due_date: dueDate || "TBD",
        sheet_url: sheetUrl.trim() || null,
        status: completed ? "complete" : "pending",
        sheet_progress: completed ? 100 : 0,
      },
      { keepOpen: true },
    );
    setIsCreating(false);
    if (created?.id) {
      setCreatedStage(created);
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    await onSave({
      title: title.trim(),
      due_date: dueDate || "TBD",
      sheet_url: sheetUrl.trim() || null,
      status: completed ? "complete" : "pending",
      sheet_progress: completed ? 100 : 0,
    });
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90dvh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e9e9e7]">
          <div>
            <h2 className="text-base font-bold text-[#37352f]">
              {initialData ? "Edit Stage & Sheet Sync" : "Create Stage & Sync Google Sheet"}
            </h2>
            <p className="text-xs text-[#787774]">
              {step === 1 ? "Step 1: Stage details & timeline" : "Step 2: Live Google Sheets automation"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#787774] hover:bg-[#f4f4f5]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-2 py-3 border-b border-[#f0f0ec] text-xs font-medium text-[#787774]">
          <button 
            type="button" 
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${step === 1 ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50"}`}
          >
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
            Stage Info
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
          <button 
            type="button" 
            onClick={goToSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${step === 2 ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50"}`}
          >
            <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">2</span>
            Google Sheets Sync
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">Stage Title *</label>
                <input
                  required
                  placeholder="e.g. Wireframes & UX Research"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleError(false);
                  }}
                  className={`w-full h-9 px-3 rounded-lg border bg-[#fafafa] outline-none focus:border-blue-600 ${titleError ? "border-rose-400" : "border-[#e9e9e7]"}`}
                />
                {titleError && (
                  <p className="mt-1 text-[10px] text-rose-600">Add a stage title first.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">Google Sheet URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] border border-[#e9e9e7]">
                <div>
                  <span className="font-bold text-[#37352f] block">Mark Stage as Complete</span>
                  <span className="text-[10px] text-[#787774]">Instantly sets progress to 100%</span>
                </div>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-blue-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>Automatic Progress Syncing</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  Link any Google Sheet to this stage so that updating cell <code className="bg-white px-1 py-0.5 rounded font-mono font-bold">B1</code> instantly syncs live progress back to your client dashboard!
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#37352f]">1. Copy Custom Apps Script</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20201e] text-white font-semibold text-[11px] hover:bg-black transition"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied to Clipboard!" : "Copy Script"}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-3 bg-[#1e1e1e] text-[#d4d4d4] rounded-xl font-mono text-[10px] overflow-x-auto max-h-36">
                    {generatedScript}
                  </pre>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#e9e9e7]">
                <span className="font-bold text-[#37352f] block">2. Setup Instructions in Google Sheets:</span>
                <ul className="list-disc pl-4 space-y-1 text-[#787774] text-[11px]">
                  <li>Open your Google Sheet and enter the completion percentage in cell <b>B1</b>.</li>
                  <li>In the top menu, go to <b className="text-[#37352f]">Extensions &gt; Apps Script</b>.</li>
                  <li>Paste the code above into the editor and click <b>Save</b> (floppy disk icon).</li>
                  <li>Set up an <b>Edit Trigger</b> (`onEdit` or time-driven trigger) to call <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">syncProgressToSupabase</code> whenever cell B1 changes.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#e9e9e7]">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-1.5 rounded-lg border border-[#e9e9e7] bg-white font-semibold text-[#37352f]"
              >
                Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-[#e9e9e7] bg-white font-semibold text-[#37352f]"
              >
                Cancel
              </button>
              {step === 1 ? (
                <button
                  key="next"
                  type="button"
                  onClick={goToSync}
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1 hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating stage…
                    </>
                  ) : (
                    <>
                      Next: Sheet Sync <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  key="save"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5 hover:bg-blue-700 transition shadow-xs"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Stage
                </button>
              )}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}