"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Download, Maximize2, Search, X, ZoomIn, ZoomOut } from "lucide-react";

type ParameterValue = {
  displayValue?: string | null;
  name?: string;
  storageType?: string;
  unitTypeId?: string | null;
  value?: string | number | null;
};

type OntologyLevel = {
  elementId: string;
  elevation?: number;
  elevationUnit?: string;
  name: string;
  uniqueId?: string;
};

type OntologyWorkset = {
  name: string;
  worksetId: string;
};

type OntologySpace = {
  elementId: string;
  kind?: string;
  levelId?: string;
  name: string;
  number?: string;
  parameters?: Record<string, ParameterValue>;
  uniqueId?: string;
  worksetId?: string;
  worksetName?: string;
};

type OntologyElement = {
  category?: string;
  elementId: string;
  familyName?: string;
  levelId?: string;
  materialIds?: string[];
  name?: string;
  ontologyClass?: string;
  parameters?: Record<string, ParameterValue>;
  relations?: Record<string, string>;
  typeElementId?: string;
  typeName?: string;
  uniqueId?: string;
  worksetId?: string;
  worksetName?: string;
};

type OntologyMaterial = {
  elementId: string;
  name: string;
  uniqueId?: string;
};

type OntologyExport = {
  elements: OntologyElement[];
  exportedAt?: string;
  levels: OntologyLevel[];
  materials: OntologyMaterial[];
  project?: {
    id?: string;
    name?: string;
    parameters?: Record<string, ParameterValue>;
  };
  schemaVersion?: string;
  sourceApplication?: string;
  sourceFile?: string;
  spaces: OntologySpace[];
  worksets: OntologyWorkset[];
};

type GraphMode = "workset" | "level" | "material" | "host";
type ViewMode = "elements" | "spaces";

type GraphNodeKind =
  | "workset"
  | "category"
  | "level"
  | "space"
  | "element"
  | "material";

type GraphNode = {
  categoryName?: string;
  count?: number;
  id: string;
  kind: GraphNodeKind;
  label: string;
  sourceId?: string;
  worksetId?: string;
  x: number;
  y: number;
};

type GraphEdge = {
  from: string;
  label: string;
  predicate: string;
  relation:
    | "containsObject"
    | "hasCategory"
    | "hasMaterial"
    | "hostedBy"
    | "locatedOnLevel";
  to: string;
};

type GraphData = {
  contentHeight: number;
  contentWidth: number;
  edges: GraphEdge[];
  nodes: GraphNode[];
};

type ViewerModelCandidate = {
  createdAt: string;
  derivativeCount: number;
  id: string;
  originalFileName: string;
  projectId?: string | null;
  status: string;
  updatedAt?: string | null;
};

type OntologyProjectPageProps = {
  projectId: string;
  projectName: string;
};

type ScopeFilter =
  | {
      kind: "workset";
      label: string;
      worksetId: string;
    }
  | {
      categoryName: string;
      kind: "category";
      label: string;
      worksetId: string;
    };

type ScopeSummary = {
  elements: number;
  materials: number;
  spaces: number;
  totalArea: number;
  totalVolume: number;
};

const GRAPH_VIEWPORT_HEIGHT = 720;
const GRAPH_VIEWPORT_WIDTH = 1200;
const emptyGraph: GraphData = {
  contentHeight: GRAPH_VIEWPORT_HEIGHT,
  contentWidth: GRAPH_VIEWPORT_WIDTH,
  edges: [],
  nodes: []
};
const sparqlResultFiles = [
  {
    file: "10_workset_category_quantity_summary.csv",
    label: "Workset Category Quantity"
  },
  {
    file: "06_workset_overview.csv",
    label: "Workset Overview"
  },
  {
    file: "07_workset_category_counts.csv",
    label: "Workset Category Counts"
  },
  {
    file: "09_workset_category_object_paths.csv",
    label: "Workset Category Object Paths"
  },
  {
    file: "11_zone_system_phase_overview.csv",
    label: "Zone System Phase"
  },
  {
    file: "12_domain_extensions_by_scope.csv",
    label: "Domain Extensions"
  }
];
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-4 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]";

export function OntologyProjectPage({ projectId, projectName }: OntologyProjectPageProps) {
  const [data, setData] = useState<OntologyExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState<ViewMode>("elements");
  const [graphMode, setGraphMode] = useState<GraphMode>("workset");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter | null>(null);
  const [viewerModel, setViewerModel] = useState<ViewerModelCandidate | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOntology() {
      try {
        const response = await fetch("/ontology/latest_revit_export.json", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`온톨로지 파일을 불러오지 못했습니다. (${response.status})`);
        }

        const loaded = normalizeOntologyExport(
          (await response.json()) as Partial<OntologyExport>
        );

        if (cancelled) {
          return;
        }

        setData(loaded);
        setSelectedId(loaded.elements[0]?.elementId ?? loaded.spaces[0]?.elementId ?? null);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "온톨로지 파일을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOntology();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadViewerModelCandidate() {
      try {
        const response = await fetch("/api/ifc/models", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          models?: ViewerModelCandidate[];
        };
        const candidate = pickViewerModelCandidate(payload.models ?? [], projectId);

        if (!cancelled) {
          setViewerModel(candidate);
        }
      } catch {
        if (!cancelled) {
          setViewerModel(null);
        }
      }
    }

    void loadViewerModelCandidate();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const categories = useMemo(() => {
    if (!data) {
      return [];
    }

    return Array.from(
      new Set(data.elements.map((element) => element.category).filter(Boolean) as string[])
    ).sort((left, right) => left.localeCompare(right));
  }, [data]);

  const filteredElements = useMemo(() => {
    if (!data) {
      return [];
    }

    const searchText = query.trim().toLowerCase();

    return data.elements.filter((element) => {
      const matchesCategory = !category || element.category === category;
      const matchesScope = matchesScopeFilter(element, scopeFilter);
      const matchesSearch =
        !searchText || getElementSearchText(element).includes(searchText);

      return matchesCategory && matchesScope && matchesSearch;
    });
  }, [category, data, query, scopeFilter]);

  const filteredSpaces = useMemo(() => {
    if (!data) {
      return [];
    }

    const searchText = query.trim().toLowerCase();

    return data.spaces.filter((space) => {
      if (!matchesScopeFilter(space, scopeFilter)) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      return [
        space.elementId,
        space.uniqueId,
        space.kind,
        space.number,
        space.name,
        space.worksetId,
        space.worksetName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchText);
    });
  }, [data, query, scopeFilter]);

  const selectedItem = useMemo(() => {
    if (!data || !selectedId) {
      return null;
    }

    return (
      data.elements.find((element) => element.elementId === selectedId) ??
      data.spaces.find((space) => space.elementId === selectedId) ??
      null
    );
  }, [data, selectedId]);

  const graph = useMemo(() => {
    return data ? buildGraph(data, graphMode) : emptyGraph;
  }, [data, graphMode]);

  const selectedGraphNode = useMemo(() => {
    return (
      graph.nodes.find((node) => node.id === selectedNodeId) ??
      graph.nodes.find((node) => node.sourceId === selectedId) ??
      null
    );
  }, [graph.nodes, selectedId, selectedNodeId]);

  const activeScopeSummary = useMemo(() => {
    if (!data || !scopeFilter) {
      return {
        elements: 0,
        materials: 0,
        spaces: 0,
        totalArea: 0,
        totalVolume: 0
      };
    }

    return summarizeScope(data, scopeFilter);
  }, [data, scopeFilter]);

  function selectScope(nextScope: ScopeFilter) {
    setCategory("");
    setScopeFilter(nextScope);
    setView(
      nextScope.kind === "category" &&
        (nextScope.categoryName === "Rooms" || nextScope.categoryName === "Spaces")
        ? "spaces"
        : "elements"
    );

    const nextItem =
      data?.elements.find((element) => matchesScopeFilter(element, nextScope)) ??
      data?.spaces.find((space) => matchesScopeFilter(space, nextScope)) ??
      null;
    setSelectedId(nextItem?.elementId ?? null);
  }

  if (isLoading) {
    return <OntologyStatus title="Ontology" message="온톨로지 데이터를 불러오는 중입니다." />;
  }

  if (error) {
    return <OntologyStatus title="Ontology" message={error} />;
  }

  if (!data) {
    return <OntologyStatus title="Ontology" message="표시할 온톨로지 데이터가 없습니다." />;
  }

  const visibleItems = view === "elements" ? filteredElements : filteredSpaces;
  const visibleListItems = visibleItems.slice(0, 300);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
            Ontology
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#171717]">
            {data.project?.name ?? projectName}
          </h2>
          <p className="mt-2 max-w-[920px] break-words text-sm leading-6 text-[#4d4d4d]">
            {data.sourceFile ?? "Revit ontology export"}
          </p>
        </div>
        <a
          className={secondaryButtonClass}
          download
          href="/ontology/latest_revit_export.ttl"
        >
          <Download size={16} aria-hidden />
          TTL 다운로드
        </a>
      </div>

      <div className="grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-lg:grid-cols-2">
        <OntologyMetric label="Worksets" value={data.worksets.length} />
        <OntologyMetric label="Levels" value={data.levels.length} />
        <OntologyMetric label="Spaces" value={data.spaces.length} />
        <OntologyMetric label="Elements" value={data.elements.length} />
        <OntologyMetric label="Materials" value={data.materials.length} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-[minmax(0,1fr)_320px] max-lg:grid-cols-1">
        <section className="flex min-h-[680px] min-w-0 flex-col rounded-[8px] border border-[#ebebeb] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] max-md:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
                Knowledge Graph
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#171717]">
                지식 그래프
              </h3>
            </div>
            <select
              className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none transition focus:border-[#171717]"
              onChange={(event) => {
                setGraphMode(event.target.value as GraphMode);
                setScopeFilter(null);
                setSelectedNodeId(null);
              }}
              value={graphMode}
            >
              <option value="workset">Workset ontology</option>
              <option value="level">Level knowledge</option>
              <option value="material">Material knowledge</option>
              <option value="host">Host knowledge</option>
            </select>
          </div>
          <OntologyGraph
            key={`${graphMode}:${graph.nodes.length}:${graph.edges.length}:${graph.contentHeight}`}
            graph={graph}
            onSelectNode={(node) => {
              setSelectedNodeId(node.id);

              if (node.sourceId) {
                setSelectedId(node.sourceId);
                return;
              }

              if (node.kind === "workset" && node.worksetId) {
                selectScope({
                  kind: "workset",
                  label: `Workset ${node.label}`,
                  worksetId: node.worksetId
                });
                return;
              }

              if (node.kind === "category" && node.worksetId && node.categoryName) {
                selectScope({
                  categoryName: node.categoryName,
                  kind: "category",
                  label: `${node.label} | Workset ${findWorksetName(data, node.worksetId)}`,
                  worksetId: node.worksetId
                });
              }
            }}
            selectedScope={scopeFilter}
            selectedId={selectedId}
          />
        </section>

        <aside className="min-h-[680px] min-w-0 overflow-auto rounded-[8px] border border-[#ebebeb] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] max-lg:min-h-0">
          <OntologyNodeDetail
            item={selectedItem}
            node={selectedGraphNode}
            projectId={projectId}
            viewerModel={viewerModel}
          />
        </aside>
      </div>

      <section className="rounded-[8px] border border-[#ebebeb] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
              Node Explorer
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#171717]">
              객체 탐색
            </h3>
          </div>
          {scopeFilter ? (
            <div className="max-w-[520px] rounded-[8px] border border-[#dbeafe] bg-[#eff6ff] p-3 text-sm text-[#1e3a8a]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
                    Graph Scope
                  </p>
                  <p className="mt-1 break-words font-medium">{scopeFilter.label}</p>
                  <p className="mt-1 text-xs text-[#4d4d4d]">
                    Elements {activeScopeSummary.elements.toLocaleString()} | Spaces{" "}
                    {activeScopeSummary.spaces.toLocaleString()} | Materials{" "}
                    {activeScopeSummary.materials.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[#4d4d4d]">
                    Area {formatQuantity(activeScopeSummary.totalArea, "m2")} | Volume{" "}
                    {formatQuantity(activeScopeSummary.totalVolume, "m3")}
                  </p>
                </div>
                <button
                  aria-label="그래프 범위 해제"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#1e3a8a] transition hover:bg-white"
                  onClick={() => {
                    setScopeFilter(null);
                    setSelectedNodeId(null);
                  }}
                  title="그래프 범위 해제"
                  type="button"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(220px,300px)_minmax(0,1fr)] gap-4 max-lg:grid-cols-1">
          <aside className="min-w-0">
          <label className="block text-sm font-medium text-[#171717]">
            검색
            <div className="relative mt-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
                aria-hidden
              />
              <input
                className="h-10 w-full rounded-[6px] border border-[#ebebeb] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#171717]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 유형, ID, Workset"
                type="search"
                value={query}
              />
            </div>
          </label>

          <label className="mt-4 block text-sm font-medium text-[#171717]">
            카테고리
            <select
              className="mt-2 h-10 w-full rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none transition focus:border-[#171717]"
              disabled={view !== "elements"}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">전체 카테고리</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={getTabClass(view === "elements")}
              onClick={() => setView("elements")}
              type="button"
            >
              Elements
            </button>
            <button
              className={getTabClass(view === "spaces")}
              onClick={() => setView("spaces")}
              type="button"
            >
              Spaces
            </button>
          </div>

        </aside>

          <div className="min-w-0">
            <div className="grid max-h-[420px] min-h-0 grid-cols-3 gap-2 overflow-auto pr-1 max-2xl:grid-cols-2 max-md:grid-cols-1">
            {visibleListItems.map((item) => (
              <button
                className={`min-h-16 w-full rounded-[8px] border px-3 py-2 text-left transition ${
                  selectedId === item.elementId
                    ? "border-[#171717] bg-[#f6f6f6]"
                    : "border-[#ebebeb] bg-white hover:bg-[#fcfcfc]"
                }`}
                key={item.elementId}
                onClick={() => {
                  setSelectedId(item.elementId);
                  setSelectedNodeId(item.elementId);
                }}
                type="button"
              >
                <span className="block truncate text-sm font-semibold text-[#171717]">
                  {getItemTitle(item)}
                </span>
                <span className="mt-1 block truncate text-xs text-[#8f8f8f]">
                  {getItemMeta(item)}
                </span>
              </button>
            ))}
            </div>

          {visibleItems.length > visibleListItems.length ? (
            <p className="mt-3 text-xs text-[#8f8f8f]">
              {visibleItems.length.toLocaleString()}개 중 300개 표시
            </p>
          ) : null}
          </div>
        </div>
      </section>

      <SparqlResultsPanel />
    </div>
  );
}

function OntologyStatus({ message, title }: { message: string; title: string }) {
  return (
    <div className="rounded-[8px] border border-[#ebebeb] bg-white p-8 text-[#171717]">
      <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
        {title}
      </p>
      <p className="mt-3 text-sm text-[#4d4d4d]">{message}</p>
    </div>
  );
}

function OntologyMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[8px] border border-[#ebebeb] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      <span className="text-sm text-[#8f8f8f]">{label}</span>
      <strong className="mt-2 block text-3xl font-semibold text-[#171717]">
        {value.toLocaleString()}
      </strong>
    </article>
  );
}

function OntologyNodeDetail({
  item,
  node,
  projectId,
  viewerModel
}: {
  item: OntologyElement | OntologySpace | null;
  node: GraphNode | null;
  projectId: string;
  viewerModel: ViewerModelCandidate | null;
}) {
  if (!node) {
    return (
      <div className="flex min-h-[360px] flex-col justify-center rounded-[8px] border border-dashed border-[#d4d4d4] bg-[#fcfcfc] p-6 text-center">
        <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
          Node Detail
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[#171717]">노드를 선택하세요</h3>
        <p className="mt-2 text-sm leading-6 text-[#737373]">
          그래프에서 Workset, Category, Object 노드를 클릭하면 상세 정보가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  const nodeRows = [
    ["NodeId", node.id],
    ["Type", node.kind],
    ["Label", node.label],
    ["Count", node.count?.toLocaleString()],
    ["WorksetId", node.worksetId],
    ["Category", node.categoryName],
    ["SourceId", node.sourceId]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "") as Array<
    [string, string | number]
  >;
  const isObjectNode = node.kind === "element" || node.kind === "space";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8f8f8f]">
            {node.kind}
          </p>
          <h3 className="mt-2 break-words text-xl font-semibold text-[#171717]">
            {node.label}
          </h3>
        </div>
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: getNodeColor(node.kind) }}
        />
      </div>

      <dl className="mt-5 grid grid-cols-[minmax(88px,130px)_minmax(0,1fr)] overflow-hidden rounded-[8px] border border-[#ebebeb] text-sm">
        {nodeRows.map(([label, value]) => (
          <DetailRow key={label} label={label} value={String(value)} />
        ))}
      </dl>

      {isObjectNode && item?.elementId ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="max-w-full truncate rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]">
              {item.elementId}
            </span>
            <Link
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#171717] bg-[#171717] px-3 text-xs font-semibold text-white transition hover:bg-[#2a2a2a]"
              href={getViewerSelectionHref(projectId, item.elementId, viewerModel)}
              title="3D viewer에서 객체 선택"
            >
              <Box size={14} aria-hidden />
              3D에서 보기
            </Link>
          </div>
          <OntologyDetail item={item} />
        </>
      ) : (
        <p className="mt-5 rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-4 text-sm leading-6 text-[#737373]">
          이 노드는 온톨로지 구조 노드입니다. 객체 목록은 현재 선택된 그래프 범위를 기준으로 필터링됩니다.
        </p>
      )}
    </div>
  );
}

function SparqlResultsPanel() {
  const [selectedFile, setSelectedFile] = useState(sparqlResultFiles[0].file);
  const [table, setTable] = useState<{ headers: string[]; rows: string[][] } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadResult() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/ontology/results/${selectedFile}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`SPARQL result not found (${response.status})`);
        }

        const parsed = parseCsv(await response.text());

        if (!cancelled) {
          setTable(parsed);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setTable(null);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "SPARQL result could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const visibleRows = table?.rows.slice(0, 80) ?? [];

  return (
    <section className="rounded-[8px] border border-[#ebebeb] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
            SPARQL
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#171717]">
            Query Results
          </h3>
        </div>
        <select
          className="h-10 min-w-[260px] rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none transition focus:border-[#171717]"
          onChange={(event) => setSelectedFile(event.target.value)}
          value={selectedFile}
        >
          {sparqlResultFiles.map((resultFile) => (
            <option key={resultFile.file} value={resultFile.file}>
              {resultFile.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-auto rounded-[8px] border border-[#ebebeb]">
        {isLoading ? (
          <div className="p-6 text-sm text-[#8f8f8f]">Loading SPARQL result...</div>
        ) : error ? (
          <div className="p-6 text-sm text-[#be123c]">{error}</div>
        ) : table && table.headers.length > 0 ? (
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[#fcfcfc] text-xs font-semibold uppercase tracking-[0.08em] text-[#6f6f6f]">
              <tr>
                {table.headers.map((header) => (
                  <th
                    className="whitespace-nowrap border-b border-[#ebebeb] px-3 py-2"
                    key={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr className="odd:bg-white even:bg-[#fcfcfc]" key={`${selectedFile}-${rowIndex}`}>
                  {table.headers.map((header, cellIndex) => (
                    <td
                      className="max-w-[320px] truncate border-b border-[#f1f1f1] px-3 py-2 text-[#171717]"
                      key={`${header}-${cellIndex}`}
                      title={row[cellIndex] ?? ""}
                    >
                      {formatCsvCell(row[cellIndex] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-sm text-[#8f8f8f]">No rows.</div>
        )}
      </div>

      {table && table.rows.length > visibleRows.length ? (
        <p className="mt-3 text-xs text-[#8f8f8f]">
          {table.rows.length.toLocaleString()} rows, showing 80.
        </p>
      ) : null}
    </section>
  );
}

function OntologyDetail({ item }: { item: OntologyElement | OntologySpace | null }) {
  if (!item) {
    return <p className="mt-6 text-sm text-[#8f8f8f]">항목을 선택해 주세요.</p>;
  }

  const rows = Object.entries({
    ElementId: item.elementId,
    UniqueId: item.uniqueId,
    LevelId: item.levelId,
    WorksetId: item.worksetId,
    WorksetName: item.worksetName,
    Category: "category" in item ? item.category : undefined,
    Class: "ontologyClass" in item ? item.ontologyClass : undefined,
    Family: "familyName" in item ? item.familyName : undefined,
    Type: "typeName" in item ? item.typeName : undefined
  }).filter(([, value]) => value !== undefined && value !== null && value !== "");
  const parameterRows = Object.entries(item.parameters ?? {}).slice(0, 24);

  return (
    <dl className="mt-6 grid grid-cols-[minmax(110px,160px)_minmax(0,1fr)] overflow-hidden rounded-[8px] border border-[#ebebeb] text-sm">
      {rows.map(([label, value]) => (
        <DetailRow key={label} label={label} value={String(value)} />
      ))}
      {parameterRows.map(([label, parameter]) => (
        <DetailRow
          key={label}
          label={label}
          value={String(parameter.displayValue ?? parameter.value ?? "")}
        />
      ))}
    </dl>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="border-b border-r border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-xs font-medium text-[#8f8f8f]">
        {label}
      </dt>
      <dd className="break-words border-b border-[#ebebeb] bg-white px-3 py-2 text-[#171717]">
        {value}
      </dd>
    </>
  );
}

function OntologyGraph({
  graph,
  onSelectNode,
  selectedScope,
  selectedId
}: {
  graph: GraphData;
  onSelectNode: (node: GraphNode) => void;
  selectedScope: ScopeFilter | null;
  selectedId: string | null;
}) {
  const [transform, setTransform] = useState(() => getInitialGraphTransform(graph));
  const [showObjectLabels, setShowObjectLabels] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to)),
    [graph.edges, nodeById]
  );
  const relationCounts = useMemo(() => {
    return visibleEdges.reduce(
      (acc, edge) => {
        acc[edge.relation] = (acc[edge.relation] ?? 0) + 1;
        return acc;
      },
      {} as Partial<Record<GraphEdge["relation"], number>>
    );
  }, [visibleEdges]);
  const showEdgeLabels = visibleEdges.length <= 180 || transform.scale >= 1.7;

  if (graph.nodes.length === 0) {
    return (
      <div className="mt-4 flex min-h-[440px] items-center justify-center rounded-[8px] border border-dashed border-[#ebebeb] bg-[#fcfcfc] text-sm text-[#8f8f8f]">
        표시할 관계가 없습니다.
      </div>
    );
  }

  function zoomBy(multiplier: number) {
    setTransform((current) =>
      getZoomedTransform(
        current,
        multiplier,
        GRAPH_VIEWPORT_WIDTH / 2,
        GRAPH_VIEWPORT_HEIGHT / 2
      )
    );
  }

  return (
    <div className="relative mt-4 h-[560px] min-h-0 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)] max-md:h-[420px]">
      <div className="absolute right-3 top-3 z-10 max-h-[42%] min-w-[190px] max-w-[260px] overflow-auto rounded-[12px] border border-[#ebebeb] bg-white p-3 text-xs shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
          지식 모델
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {getKnowledgeLegendItems().map((item) => (
            <span className="inline-flex items-center gap-1.5" key={item.label}>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[#404040]">{item.label}</span>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[#737373]">
          {getRelationLegendItems()
            .filter((item) => relationCounts[item.relation])
            .map((item) => (
              <span className="inline-flex items-center gap-1.5" key={item.relation}>
                <span
                  className="h-px w-5"
                  style={{ backgroundColor: item.color }}
                />
                {item.label} {relationCounts[item.relation]?.toLocaleString()}
              </span>
            ))}
        </div>
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex w-[250px] items-center gap-1 rounded-[12px] border border-[#ebebeb] bg-white p-3 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
        <IconButton ariaLabel="Zoom in graph" onClick={() => zoomBy(1.2)}>
          <ZoomIn size={15} aria-hidden />
        </IconButton>
        <IconButton ariaLabel="Zoom out graph" onClick={() => zoomBy(0.84)}>
          <ZoomOut size={15} aria-hidden />
        </IconButton>
        <IconButton
          ariaLabel="Reset graph view"
          onClick={() => setTransform(getInitialGraphTransform(graph))}
        >
          <Maximize2 size={15} aria-hidden />
        </IconButton>
        <button
          className={`h-8 flex-1 rounded-[6px] border px-2 text-[11px] font-medium transition ${
            showObjectLabels
              ? "border-[#0074e2] text-[#0074e2]"
              : "border-[#d4d4d4] text-[#525252] hover:bg-[#f6f6f6]"
          }`}
          onClick={() => setShowObjectLabels((current) => !current)}
          type="button"
        >
          Labels
        </button>
      </div>
      <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#ebebeb] bg-white px-4 py-1.5 text-xs text-[#737373] shadow-[0_6px_18px_rgba(0,0,0,0.10)]">
        <strong className="text-[#171717]">{graph.nodes.length.toLocaleString()}</strong> nodes
        {" / "}
        <strong className="text-[#171717]">{visibleEdges.length.toLocaleString()}</strong> edges
      </div>
      <svg
        aria-label="Ontology relationship graph"
        className="block h-full w-full max-w-full touch-none select-none bg-white"
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onPointerDown={(event) => {
          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) {
            return;
          }

          const rect = event.currentTarget.getBoundingClientRect();
          const deltaX =
            (event.clientX - dragRef.current.x) * (GRAPH_VIEWPORT_WIDTH / rect.width);
          const deltaY =
            (event.clientY - dragRef.current.y) * (GRAPH_VIEWPORT_HEIGHT / rect.height);

          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY
          };
          setTransform((current) => ({
            ...current,
            x: current.x + deltaX,
            y: current.y + deltaY
          }));
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
          }
        }}
        onWheel={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const pointerX =
            ((event.clientX - rect.left) / rect.width) * GRAPH_VIEWPORT_WIDTH;
          const pointerY =
            ((event.clientY - rect.top) / rect.height) * GRAPH_VIEWPORT_HEIGHT;
          setTransform((current) =>
            getZoomedTransform(current, event.deltaY < 0 ? 1.14 : 0.88, pointerX, pointerY)
          );
        }}
        role="img"
        viewBox={`0 0 ${GRAPH_VIEWPORT_WIDTH} ${GRAPH_VIEWPORT_HEIGHT}`}
      >
        <defs>
          <pattern
            height="34"
            id="ontology-grid"
            patternUnits="userSpaceOnUse"
            width="34"
          >
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#f1f1f1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect fill="url(#ontology-grid)" height={GRAPH_VIEWPORT_HEIGHT} width={GRAPH_VIEWPORT_WIDTH} />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {visibleEdges.map((edge, index) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            const pathId = `kg-edge-${index}`;

            if (!from || !to) {
              return null;
            }

            return (
              <g key={`${edge.from}-${edge.to}-${edge.predicate}-${index}`}>
                <path
                  d={getEdgePath(from, to)}
                  fill="none"
                  id={pathId}
                  stroke={getEdgeColor(edge.relation)}
                  strokeOpacity={edge.relation === "containsObject" ? 0.28 : 0.68}
                  strokeWidth={edge.relation === "containsObject" ? "1.1" : "2"}
                />
                {showEdgeLabels && edge.relation !== "containsObject" ? (
                  <text
                    dy="-4"
                    fill={getEdgeColor(edge.relation)}
                    fontSize="10"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                      {edge.label}
                    </textPath>
                  </text>
                ) : null}
              </g>
            );
          })}
          {graph.nodes.map((node) => {
            const isSelected =
              node.sourceId === selectedId || isScopeNodeSelected(node, selectedScope);
            const { height, width } = getNodeSize(node.kind);
            const isLeafNode = node.kind === "element" || node.kind === "space";
            const showNodeLabel =
              !isLeafNode || isSelected || showObjectLabels || transform.scale >= 1.7;
            const textAnchor = isLeafNode ? "start" : "middle";
            const textX = isLeafNode ? node.x + width / 2 + 7 : node.x;
            const textY = isLeafNode ? node.y : node.y - height / 2 - 12;

            return (
              <g
                className={
                  node.sourceId || node.kind === "workset" || node.kind === "category"
                    ? "cursor-pointer"
                    : undefined
                }
                key={node.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node);
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  fill={getNodeColor(node.kind)}
                  opacity={isLeafNode ? 0.94 : 1}
                  r={width / 2}
                  stroke={isSelected ? "#171717" : "#ffffff"}
                  strokeWidth={isSelected ? "3" : isLeafNode ? "1" : "2"}
                />
                {showNodeLabel ? (
                  <text
                    dominantBaseline="middle"
                    fill={isLeafNode ? "#4b5563" : "#5b21b6"}
                    fontSize={isLeafNode ? "10" : "12"}
                    fontWeight={node.kind === "workset" ? "700" : "600"}
                    paintOrder="stroke"
                    stroke="#fcfcfc"
                    strokeWidth="3"
                    textAnchor={textAnchor}
                    x={textX}
                    y={textY}
                  >
                    {formatGraphLabel(node)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function IconButton({
  ariaLabel,
  children,
  onClick
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#171717] transition hover:bg-[#f6f6f6]"
      onClick={onClick}
      title={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
}

function buildGraph(data: OntologyExport, mode: GraphMode): GraphData {
  if (mode === "level") {
    return buildLevelGraph(data);
  }

  if (mode === "material") {
    return buildMaterialGraph(data);
  }

  if (mode === "host") {
    return buildHostGraph(data);
  }

  return buildWorksetGraph(data);
}

function buildWorksetGraph(data: OntologyExport): GraphData {
  const centerX = 0;
  const centerY = 0;
  const worksetRadius = 420;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const worksetById = new Map(
    data.worksets.map((workset) => [workset.worksetId, workset])
  );
  const allWorksetIds = new Set([
    ...data.worksets.map((workset) => workset.worksetId),
    ...data.elements.map((element) => element.worksetId).filter(Boolean),
    ...data.spaces.map((space) => space.worksetId).filter(Boolean)
  ] as string[]);
  const sortedWorksets = Array.from(allWorksetIds)
    .map((worksetId) => {
      const known = worksetById.get(worksetId);
      return {
        name: known?.name ?? findWorksetName(data, worksetId),
        worksetId
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const [worksetIndex, workset] of sortedWorksets.entries()) {
    const worksetAngle =
      (Math.PI * 2 * worksetIndex) / Math.max(sortedWorksets.length, 1) - Math.PI / 2;
    const worksetX = centerX + Math.cos(worksetAngle) * worksetRadius;
    const worksetY = centerY + Math.sin(worksetAngle) * worksetRadius;
    const worksetElements = data.elements
      .filter((element) => element.worksetId === workset.worksetId)
      .sort(compareOntologyElement);
    const worksetSpaces = data.spaces
      .filter((space) => space.worksetId === workset.worksetId)
      .sort(compareOntologySpace);
    const rows = [
      ...worksetSpaces.map((space) => ({
        category: getSpaceCategoryName(space),
        id: space.elementId,
        kind: "space" as const,
        label: space.number ? `${space.number} ${space.name}` : space.name,
        sourceId: space.elementId
      })),
      ...worksetElements.map((element) => ({
        category: element.category ?? "Elements",
        id: element.elementId,
        kind: "element" as const,
        label: getItemTitle(element),
        sourceId: element.elementId
      }))
    ];
    const worksetId = worksetNodeId(workset.worksetId);

    nodes.push({
      count: rows.length,
      id: worksetId,
      kind: "workset",
      label: workset.name,
      worksetId: workset.worksetId,
      x: worksetX,
      y: worksetY
    });

    if (rows.length === 0) {
      continue;
    }

    const categoryGroups = groupBy(rows, (row) => row.category);
    const categorySpread = Math.min(Math.PI * 0.82, Math.max(Math.PI * 0.18, categoryGroups.length * 0.13));
    const categoryDistance = 170 + Math.min(120, categoryGroups.length * 7);

    for (const [categoryIndex, [categoryName, categoryRows]] of categoryGroups.entries()) {
      const categoryAngle =
        categoryGroups.length === 1
          ? worksetAngle
          : worksetAngle -
            categorySpread / 2 +
            (categorySpread * categoryIndex) / Math.max(categoryGroups.length - 1, 1);
      const categoryX = worksetX + Math.cos(categoryAngle) * categoryDistance;
      const categoryY = worksetY + Math.sin(categoryAngle) * categoryDistance;
      const categoryId = categoryNodeId(workset.worksetId, categoryName);
      const objectRows = layoutKnowledgeLeaves(categoryRows, categoryX, categoryY, categoryAngle);

      nodes.push({
        categoryName,
        count: categoryRows.length,
        id: categoryId,
        kind: "category",
        label: categoryName,
        worksetId: workset.worksetId,
        x: categoryX,
        y: categoryY
      });
      edges.push({
        from: worksetId,
        label: "bim:hasCategory",
        predicate: "bim:hasCategory",
        relation: "hasCategory",
        to: categoryId
      });

      for (const row of objectRows) {
        nodes.push({
          id: row.id,
          kind: row.kind,
          label: row.label,
          sourceId: row.sourceId,
          x: row.x,
          y: row.y
        });
        edges.push({
          from: categoryId,
          label: row.kind === "space" ? "bim:containsSpace" : "bim:containsElement",
          predicate: row.kind === "space" ? "bim:containsSpace" : "bim:containsElement",
          relation: "containsObject",
          to: row.id
        });
      }
    }
  }

  return normalizeGraphBounds(nodes, edges);
}

function layoutKnowledgeLeaves<T>(
  rows: T[],
  centerX: number,
  centerY: number,
  directionAngle: number
): Array<T & { x: number; y: number }> {
  return rows.map((row, index) => {
    const ringIndex = Math.floor(Math.sqrt(index / 4));
    const ringStart = ringIndex === 0 ? 0 : Math.pow(ringIndex, 2) * 4;
    const ringCapacity = Math.max(8, 12 + ringIndex * 8);
    const indexInRing = index - ringStart;
    const countInRing = Math.min(ringCapacity, rows.length - ringStart);
    const spread = countInRing === 1 ? 0 : Math.min(Math.PI * 1.42, Math.PI * 0.58 + countInRing * 0.045);
    const startAngle = -spread / 2;
    const angle =
      countInRing === 1
        ? 0
        : startAngle + (spread * indexInRing) / Math.max(1, countInRing - 1);
    const radius = 72 + Math.max(0, ringIndex) * 32;

    return {
      ...row,
      x: centerX + Math.cos(directionAngle + angle) * radius,
      y: centerY + Math.sin(directionAngle + angle) * radius
    };
  });
}

function buildLevelGraph(data: OntologyExport): GraphData {
  const rawNodes = [
    ...data.levels.map((level) => ({
      id: level.elementId,
      kind: "level" as const,
      label: level.name
    })),
    ...data.spaces.map((space) => ({
      id: space.elementId,
      kind: "space" as const,
      label: space.number ? `${space.number} ${space.name}` : space.name,
      sourceId: space.elementId
    })),
    ...data.elements.slice(0, 180).map((element) => ({
      id: element.elementId,
      kind: "element" as const,
      label: getItemTitle(element),
      sourceId: element.elementId
    }))
  ];
  const visibleIds = new Set(rawNodes.map((node) => node.id));
  const edges = [
    ...data.spaces
      .filter((space) => space.levelId && visibleIds.has(space.levelId))
      .map((space) => ({
        from: space.levelId as string,
        label: "bim:locatedOnLevel",
        predicate: "bim:locatedOnLevel",
        relation: "locatedOnLevel" as const,
        to: space.elementId
      })),
    ...data.elements
      .slice(0, 180)
      .filter((element) => element.levelId && visibleIds.has(element.levelId))
      .map((element) => ({
        from: element.levelId as string,
        label: "bim:locatedOnLevel",
        predicate: "bim:locatedOnLevel",
        relation: "locatedOnLevel" as const,
        to: element.elementId
      }))
  ];

  return layoutCircularGraph(rawNodes, edges);
}

function buildMaterialGraph(data: OntologyExport): GraphData {
  const materialById = new Map(data.materials.map((material) => [material.elementId, material]));
  const elements = data.elements
    .filter((element) => (element.materialIds ?? []).length > 0)
    .slice(0, 180);
  const materialIds = new Set(elements.flatMap((element) => element.materialIds ?? []));
  const materials = Array.from(materialIds)
    .map((materialId) => materialById.get(materialId))
    .filter((material): material is OntologyMaterial => Boolean(material));
  const rawNodes = [
    ...materials.map((material) => ({
      id: material.elementId,
      kind: "material" as const,
      label: material.name
    })),
    ...elements.map((element) => ({
      id: element.elementId,
      kind: "element" as const,
      label: getItemTitle(element),
      sourceId: element.elementId
    }))
  ];
  const edges = elements.flatMap((element) =>
    (element.materialIds ?? [])
      .filter((materialId) => materialById.has(materialId))
      .map((materialId) => ({
        from: element.elementId,
        label: "bim:hasMaterial",
        predicate: "bim:hasMaterial",
        relation: "hasMaterial" as const,
        to: materialId
      }))
  );

  return layoutCircularGraph(rawNodes, edges);
}

function buildHostGraph(data: OntologyExport): GraphData {
  const elementById = new Map(data.elements.map((element) => [element.elementId, element]));
  const hostedElements = data.elements
    .filter((element) => element.relations?.isHostedBy)
    .slice(0, 180);
  const hostIds = new Set(
    hostedElements.map((element) => element.relations?.isHostedBy).filter(Boolean) as string[]
  );
  const hostElements = Array.from(hostIds)
    .map((hostId) => elementById.get(hostId))
    .filter((element): element is OntologyElement => Boolean(element));
  const rawNodes = [...hostElements, ...hostedElements].map((element) => ({
    id: element.elementId,
    kind: "element" as const,
    label: getItemTitle(element),
    sourceId: element.elementId
  }));
  const visibleIds = new Set(rawNodes.map((node) => node.id));
  const edges = hostedElements
    .filter((element) => element.relations?.isHostedBy)
    .filter((element) => visibleIds.has(element.relations?.isHostedBy as string))
    .map((element) => ({
      from: element.relations?.isHostedBy as string,
      label: "bim:hostedBy",
      predicate: "bim:hostedBy",
      relation: "hostedBy" as const,
      to: element.elementId
    }));

  return layoutCircularGraph(rawNodes, edges);
}

function layoutCircularGraph(
  rawNodes: Array<Omit<GraphNode, "x" | "y">>,
  edges: GraphEdge[]
): GraphData {
  const centerX = 540;
  const centerY = 330;
  const radius = 250;
  const nodes = rawNodes.map((node, index, list) => {
    const angle = (Math.PI * 2 * index) / Math.max(list.length, 1) - Math.PI / 2;

    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });

  return normalizeGraphBounds(nodes, edges);
}

function normalizeGraphBounds(nodes: GraphNode[], edges: GraphEdge[]): GraphData {
  if (nodes.length === 0) {
    return emptyGraph;
  }

  const padding = 160;
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const offsetX = padding - minX;
  const offsetY = padding - minY;
  const shiftedNodes = nodes.map((node) => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY
  }));

  return {
    contentHeight: Math.max(maxY - minY + padding * 2, GRAPH_VIEWPORT_HEIGHT),
    contentWidth: Math.max(maxX - minX + padding * 2, GRAPH_VIEWPORT_WIDTH),
    edges,
    nodes: shiftedNodes
  };
}

function getInitialGraphTransform(graph: GraphData) {
  const scale = clamp(
    Math.min(
      GRAPH_VIEWPORT_WIDTH / Math.max(graph.contentWidth, 1),
      GRAPH_VIEWPORT_HEIGHT / Math.max(graph.contentHeight, 1)
    ) * 0.92,
    0.12,
    1
  );

  return {
    scale,
    x: (GRAPH_VIEWPORT_WIDTH - graph.contentWidth * scale) / 2,
    y: (GRAPH_VIEWPORT_HEIGHT - graph.contentHeight * scale) / 2
  };
}

function getZoomedTransform(
  current: { scale: number; x: number; y: number },
  multiplier: number,
  focusX: number,
  focusY: number
) {
  const nextScale = clamp(current.scale * multiplier, 0.12, 3.2);
  const graphX = (focusX - current.x) / current.scale;
  const graphY = (focusY - current.y) / current.scale;

  return {
    scale: nextScale,
    x: focusX - graphX * nextScale,
    y: focusY - graphY * nextScale
  };
}

function normalizeOntologyExport(data: Partial<OntologyExport>): OntologyExport {
  return {
    ...data,
    elements: data.elements ?? [],
    levels: data.levels ?? [],
    materials: data.materials ?? [],
    spaces: data.spaces ?? [],
    worksets: data.worksets ?? []
  };
}

function getElementSearchText(element: OntologyElement) {
  return [
    element.elementId,
    element.uniqueId,
    element.category,
    element.ontologyClass,
    element.name,
    element.familyName,
    element.typeName,
    element.worksetId,
    element.worksetName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getItemTitle(item: OntologyElement | OntologySpace) {
  if (isSpace(item)) {
    return item.number ? `${item.number} ${item.name}` : item.name;
  }

  return item.name || item.typeName || item.familyName || item.category || item.elementId;
}

function getItemMeta(item: OntologyElement | OntologySpace) {
  const workset = item.worksetName ? ` | Workset ${item.worksetName}` : "";

  if (isSpace(item)) {
    return `${item.kind ?? "Space"} | Level ${item.levelId ?? "-"}${workset}`;
  }

  return `${item.category ?? "Element"} | ${item.ontologyClass ?? "bim:Element"} | Level ${item.levelId ?? "-"}${workset}`;
}

function getViewerSelectionHref(
  projectId: string,
  elementId: string,
  viewerModel: ViewerModelCandidate | null
) {
  const query = new URLSearchParams({
    selectElementId: elementId,
    selectLocalId: elementId
  });

  if (viewerModel?.id) {
    query.set("modelId", viewerModel.id);
  }

  if (viewerModel?.projectId && viewerModel.projectId !== projectId) {
    query.set("projectId", viewerModel.projectId);
    return `/viewer?${query.toString()}`;
  }

  return `/projects/${encodeURIComponent(projectId)}/viewer?${query.toString()}`;
}

function pickViewerModelCandidate(
  models: ViewerModelCandidate[],
  projectId: string
) {
  const projectScopedModels = models.filter((model) =>
    projectId === "default" ? !model.projectId : model.projectId === projectId
  );
  const candidatePool =
    projectScopedModels.length > 0 ? projectScopedModels : models;

  return [...candidatePool]
    .filter((model) => model.derivativeCount > 0 || model.status === "READY")
    .sort((left, right) => {
      const readyDifference =
        Number(right.status === "READY") - Number(left.status === "READY");

      if (readyDifference !== 0) {
        return readyDifference;
      }

      const derivativeDifference = right.derivativeCount - left.derivativeCount;

      if (derivativeDifference !== 0) {
        return derivativeDifference;
      }

      return (
        new Date(right.updatedAt ?? right.createdAt).getTime() -
        new Date(left.updatedAt ?? left.createdAt).getTime()
      );
    })[0] ?? null;
}

function isSpace(item: OntologyElement | OntologySpace | null): item is OntologySpace {
  return Boolean(item && "kind" in item && !("category" in item));
}

function getSpaceCategoryName(space: OntologySpace) {
  return `${space.kind ?? "Space"}s`;
}

function getObjectCategoryName(item: OntologyElement | OntologySpace) {
  return isSpace(item) ? getSpaceCategoryName(item) : item.category ?? "Elements";
}

function matchesScopeFilter(
  item: OntologyElement | OntologySpace,
  scopeFilter: ScopeFilter | null
) {
  if (!scopeFilter) {
    return true;
  }

  if (item.worksetId !== scopeFilter.worksetId) {
    return false;
  }

  if (scopeFilter.kind === "workset") {
    return true;
  }

  return getObjectCategoryName(item) === scopeFilter.categoryName;
}

function summarizeScope(data: OntologyExport, scopeFilter: ScopeFilter): ScopeSummary {
  const elements = data.elements.filter((element) => matchesScopeFilter(element, scopeFilter));
  const spaces = data.spaces.filter((space) => matchesScopeFilter(space, scopeFilter));
  const materialIds = new Set(
    elements.flatMap((element) => element.materialIds ?? []).filter(Boolean)
  );
  const scopedItems: Array<OntologyElement | OntologySpace> = [...elements, ...spaces];

  return {
    elements: elements.length,
    materials: materialIds.size,
    spaces: spaces.length,
    totalArea: scopedItems.reduce(
      (sum, item) => sum + getNumericParameterValue(item, "Area"),
      0
    ),
    totalVolume: scopedItems.reduce(
      (sum, item) => sum + getNumericParameterValue(item, "Volume"),
      0
    )
  };
}

function getNumericParameterValue(
  item: OntologyElement | OntologySpace,
  parameterName: string
) {
  const rawValue = item.parameters?.[parameterName]?.value;
  const numericValue =
    typeof rawValue === "number" ? rawValue : Number.parseFloat(String(rawValue ?? ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatQuantity(value: number, unit: string) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 100 ? 0 : 2
  })} ${unit}`;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return {
    headers: rows[0] ?? [],
    rows: rows.slice(1)
  };
}

function formatCsvCell(value: string) {
  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && value.trim() !== "") {
    return numericValue.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  }

  return value;
}

function isScopeNodeSelected(node: GraphNode, scopeFilter: ScopeFilter | null) {
  if (!scopeFilter) {
    return false;
  }

  if (node.kind === "workset") {
    return scopeFilter.kind === "workset" && node.worksetId === scopeFilter.worksetId;
  }

  if (node.kind === "category") {
    return (
      scopeFilter.kind === "category" &&
      node.worksetId === scopeFilter.worksetId &&
      node.categoryName === scopeFilter.categoryName
    );
  }

  return false;
}

function compareOntologyElement(left: OntologyElement, right: OntologyElement) {
  return [
    (left.category ?? "").localeCompare(right.category ?? ""),
    (left.typeName ?? "").localeCompare(right.typeName ?? ""),
    getItemTitle(left).localeCompare(getItemTitle(right)),
    left.elementId.localeCompare(right.elementId)
  ].find((value) => value !== 0) ?? 0;
}

function compareOntologySpace(left: OntologySpace, right: OntologySpace) {
  return [
    (left.kind ?? "").localeCompare(right.kind ?? ""),
    (left.number ?? "").localeCompare(right.number ?? ""),
    left.name.localeCompare(right.name),
    left.elementId.localeCompare(right.elementId)
  ].find((value) => value !== 0) ?? 0;
}

function findWorksetName(data: OntologyExport, worksetId: string) {
  return (
    data.elements.find((element) => element.worksetId === worksetId)?.worksetName ??
    data.spaces.find((space) => space.worksetId === worksetId)?.worksetName ??
    `Workset ${worksetId}`
  );
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const result = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item) || "-";
    const group = result.get(key);

    if (group) {
      group.push(item);
    } else {
      result.set(key, [item]);
    }
  }

  return Array.from(result.entries()).sort(([left], [right]) =>
    left.localeCompare(right)
  );
}

function worksetNodeId(worksetId: string) {
  return `workset:${worksetId}`;
}

function categoryNodeId(worksetId: string, category: string) {
  return `category:${worksetId}:${category}`;
}

function getEdgePath(from: GraphNode, to: GraphNode) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const curve = Math.min(28, distance * 0.08);
  const normalX = (-dy / distance) * curve;
  const normalY = (dx / distance) * curve;
  const midX = from.x + dx * 0.5 + normalX;
  const midY = from.y + dy * 0.5 + normalY;

  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

function getNodeSize(kind: GraphNodeKind) {
  if (kind === "workset") {
    return { height: 22, width: 22 };
  }

  if (kind === "category") {
    return { height: 20, width: 20 };
  }

  if (kind === "element" || kind === "space") {
    return { height: 12, width: 12 };
  }

  return { height: 20, width: 20 };
}

function getNodeColor(kind: GraphNodeKind) {
  if (kind === "workset") {
    return "#6d5dfc";
  }

  if (kind === "category") {
    return "#6d5dfc";
  }

  if (kind === "level") {
    return "#38bdf8";
  }

  if (kind === "space") {
    return "#f8c94a";
  }

  if (kind === "material") {
    return "#f43f5e";
  }

  return "#f8c94a";
}

function getEdgeColor(relation: GraphEdge["relation"]) {
  if (relation === "hasCategory") {
    return "#c084fc";
  }

  if (relation === "containsObject") {
    return "#e5a90f";
  }

  if (relation === "locatedOnLevel") {
    return "#0891b2";
  }

  if (relation === "hasMaterial") {
    return "#be123c";
  }

  return "#7c3aed";
}

function getKnowledgeLegendItems() {
  return [
    { color: getNodeColor("workset"), label: "Workset" },
    { color: getNodeColor("category"), label: "Category" },
    { color: getNodeColor("element"), label: "Object" },
    { color: getNodeColor("space"), label: "Space" },
    { color: getNodeColor("level"), label: "Level" },
    { color: getNodeColor("material"), label: "Material" }
  ];
}

function getRelationLegendItems() {
  return [
    {
      color: getEdgeColor("hasCategory"),
      label: "hasCategory",
      relation: "hasCategory" as const
    },
    {
      color: getEdgeColor("containsObject"),
      label: "containsObject",
      relation: "containsObject" as const
    },
    {
      color: getEdgeColor("locatedOnLevel"),
      label: "locatedOnLevel",
      relation: "locatedOnLevel" as const
    },
    {
      color: getEdgeColor("hasMaterial"),
      label: "hasMaterial",
      relation: "hasMaterial" as const
    },
    {
      color: getEdgeColor("hostedBy"),
      label: "hostedBy",
      relation: "hostedBy" as const
    }
  ];
}

function formatGraphLabel(node: GraphNode) {
  const suffix = node.count === undefined ? "" : ` (${node.count.toLocaleString()})`;
  const maxLengthByKind: Record<GraphNodeKind, number> = {
    category: 18,
    element: 24,
    level: 16,
    material: 18,
    space: 24,
    workset: 13
  };

  return `${truncate(node.label, maxLengthByKind[node.kind])}${suffix}`;
}

function getTabClass(active: boolean) {
  return `h-10 rounded-[6px] border px-3 text-sm font-medium transition ${
    active
      ? "border-[#171717] bg-[#171717] text-white"
      : "border-[#ebebeb] bg-white text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
  }`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
