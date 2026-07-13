"use client";

import { Search } from "lucide-react";
import { PanelSection } from "@/components/bim-sidebar/PanelSection";
import { requestViewerObjectSelection } from "@/lib/viewer/objectSearch";
import { useViewerStore } from "@/store/viewerStore";

export function ObjectSearchPanel() {
  const query = useViewerStore((state) => state.objectSearchQuery);
  const results = useViewerStore((state) => state.objectSearchResults);
  const isReady = useViewerStore((state) => state.isObjectSearchReady);
  const isSearching = useViewerStore((state) => state.isObjectSearching);
  const setQuery = useViewerStore((state) => state.setObjectSearchQuery);

  return (
    <PanelSection title="Object Search">
      <label className="relative block">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#647083]"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Name, GlobalId, IFC Type"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 w-full rounded-md border border-[#cfd6e1] bg-white pl-9 pr-3 text-sm text-[#263142] outline-none transition placeholder:text-[#8b96a8] focus:border-[#203047] disabled:bg-[#f6f7f9]"
          disabled={!isReady}
        />
      </label>

      {!isReady ? (
        <p className="mt-2 text-xs leading-5 text-[#647083]">
          The search index is created after a model is loaded.
        </p>
      ) : null}

      {isReady && query.trim().length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-[#647083]">
          Search by object name, GlobalId, or IFC type.
        </p>
      ) : null}

      {isSearching ? (
        <p className="mt-2 text-xs leading-5 text-[#647083]">Searching...</p>
      ) : null}

      {query.trim().length > 0 && !isSearching ? (
        <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-auto pr-1">
          {results.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#cfd6e1] px-3 py-4 text-center text-xs leading-5 text-[#647083]">
              No results found.
            </p>
          ) : (
            results.map((result) => (
              <button
                key={result.objectId}
                type="button"
                className="rounded-md border border-[#d8dde6] bg-white px-3 py-2 text-left transition hover:border-[#203047] hover:bg-[#f6f7f9]"
                onClick={() =>
                  requestViewerObjectSelection(result.localId, result.modelId)
                }
              >
                <span className="block truncate text-xs font-medium text-[#263142]">
                  {result.name ?? `Object ${result.localId}`}
                </span>
                <span className="mt-1 block truncate text-[11px] text-[#647083]">
                  {[
                    result.ifcType ?? "-",
                    String(result.globalId ?? result.localId),
                    result.modelLabel
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </PanelSection>
  );
}
