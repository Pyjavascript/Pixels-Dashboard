// import { Separator } from "@/components/ui/separator"
// import { SidebarTrigger } from "@/components/ui/sidebar"

// export function SiteHeader() {
//   return (
//     <header
//       className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
//       <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
//         <SidebarTrigger className="-ml-1" />
//         <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
//         <h1 className="text-base font-medium">Documents</h1>
//       </div>
//     </header>
//   );
// }


import React from 'react';
import { Search, Plus } from 'lucide-react';

export function SiteHeader({ onNewClient }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      
      {/* Search Bar / Left Side */}
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onNewClient}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New client
        </button>
      </div>

    </header>
  );
}