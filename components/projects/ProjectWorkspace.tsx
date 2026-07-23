"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  Building2,
  CalendarDays,
  ChartNoAxesGantt,
  ClipboardList,
  CloudSun,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Home,
  Image as ImageIcon,
  Info,
  LogOut,
  MoreHorizontal,
  Moon,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sun,
  Trash2,
  Users,
  Upload,
  X
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { BimViewer } from "@/components/bim-viewer/BimViewer";
import { IfcUploadButton } from "@/components/bim-sidebar/IfcUploadButton";
import { ViewerSidebar } from "@/components/bim-sidebar/ViewerSidebar";
import type { AuthSessionUser } from "@/lib/auth/adminAuth";
import type { IfcModelSummary } from "@/store/viewerStore";

type WorkspaceView =
  | "home"
  | "projects"
  | "project"
  | "team"
  | "settings"
  | "viewer";

type ProjectWorkspaceProps = {
  currentUser: AuthSessionUser;
  initialProjectId?: string;
  projectPage?: ProjectPageKey;
  view: WorkspaceView;
};

export type ProjectPageKey =
  | "info"
  | "viewer"
  | "documents"
  | "settings"
  | "schedule"
  | "progress-payments"
  | "photos"
  | "subcontractors"
  | "members";

type ProjectComingSoonPageKey = Exclude<
  ProjectPageKey,
  "info" | "viewer" | "documents" | "settings" | "subcontractors"
>;

type ProjectInfoTabKey = "sitePhotos" | "dashboard";

type ModelsResponse = {
  models: IfcModelSummary[];
};

type KmaWeatherResponse = {
  error?: string;
  forecastDate?: string;
  highTemp?: string;
  location?: string;
  lowTemp?: string;
  weather?: string;
};

type NaverLocationSearchResult = {
  address: string;
  category: string;
  link: string;
  mapx: string;
  mapy: string;
  roadAddress: string;
  title: string;
};

type NaverLocationSearchResponse = {
  error?: string;
  locations?: NaverLocationSearchResult[];
};

type WorkspaceProject = {
  id: string;
  name: string;
  description: string;
  coverImage?: string | null;
  coverImageDisplayHeight?: number | null;
  coverImageDisplayWidth?: number | null;
  client?: string;
  contractor?: string;
  constructionPeriod?: string;
  etc?: string;
  inspector?: string;
  invitedMembers?: ProjectInvitedMember[];
  location?: string;
  locations?: string[];
  owner?: ProjectInvitedMember;
  progressRate?: string;
  projectNotes?: string;
  designer?: string;
  subcontractors?: string[];
  createdAt: string;
};

type WorkspaceProjectEditableFields = Pick<
  WorkspaceProject,
  | "name"
  | "description"
  | "coverImage"
  | "coverImageDisplayHeight"
  | "coverImageDisplayWidth"
  | "client"
  | "contractor"
  | "constructionPeriod"
  | "etc"
  | "inspector"
  | "locations"
  | "projectNotes"
  | "designer"
>;

type ProjectInvitedMember = {
  name: string;
  username: string;
};

type WorkspaceTeam = {
  id: string;
  name: string;
  members: ProjectInvitedMember[];
  owner: ProjectInvitedMember;
  createdAt: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type DailyReportWorkItem = {
  id: string;
  trade: string;
  today: string;
  tomorrow: string;
};

type DailyReportQuantityRow = {
  id: string;
  trade: string;
  name: string;
  spec: string;
  previous: string;
  today: string;
  total: string;
};

type DailyReportLaborRow = {
  id: string;
  subcontractorName?: string;
  trade: string;
  role: string;
  previous: string;
  today: string;
  total: string;
};

type DailyReportPhoto = {
  id: string;
  fileName: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
};

type SitePhotoUploadDraft = {
  file: File;
  fileName: string;
  keepAspectRatio: boolean;
  naturalHeight: number;
  naturalWidth: number;
  previewUrl: string;
  targetHeight: number;
  targetWidth: number;
};

type ConstructionDailyReport = {
  id: string;
  projectId: string;
  reportDate: string;
  weather: string;
  lowTemp: string;
  highTemp: string;
  siteManager: string;
  notes: string;
  workItems: DailyReportWorkItem[];
  contractorLaborRows: DailyReportLaborRow[];
  subcontractorLaborRows: DailyReportLaborRow[];
  laborRows?: DailyReportLaborRow[];
  equipmentRows: DailyReportQuantityRow[];
  materialRows: DailyReportQuantityRow[];
  photos: DailyReportPhoto[];
  createdAt: string;
  updatedAt: string;
};

type DailyReportLaborCollection =
  | "contractorLaborRows"
  | "subcontractorLaborRows";

type DailyReportQuantityCollection = "equipmentRows" | "materialRows";

type DailyReportSyncSchemas = {
  contractorLaborRows?: DailyReportLaborRow[];
  subcontractorLaborRows?: DailyReportLaborRow[];
  equipmentRows?: DailyReportQuantityRow[];
  materialRows?: DailyReportQuantityRow[];
};

type ProjectScheduleItem = {
  id: string;
  projectId: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  progress: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type ImportedScheduleItem = {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  notes: string;
  sourceRow: number;
  sourceSheet: string;
};

type SubcontractorDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  uploadedAt: string;
};

type ProjectSubcontractor = {
  id: string;
  projectId: string;
  companyName: string;
  managerName: string;
  managerNames: string[];
  trade: string;
  contractAmount: string;
  contractStartDate: string;
  contractEndDate: string;
  phone: string;
  email: string;
  notes: string;
  documents: SubcontractorDocument[];
  createdAt: string;
  updatedAt: string;
};

type ScheduleDateHeader = {
  dateByColumn: Array<string | null>;
  firstDateColumn: number;
  lastDateColumn: number;
  rowIndex: number;
  score: number;
};

const PROJECTS_STORAGE_KEY = "bim_workspace_projects";
const DEFAULT_PROJECT_DELETED_KEY = "bim_default_project_deleted";
const TEAMS_STORAGE_KEY = "bim_workspace_teams";
const DAILY_REPORTS_STORAGE_KEY = "bim_project_daily_reports";
const PROJECT_DOCUMENTS_STORAGE_KEY = "bim_project_documents";
const PROJECT_SCHEDULES_STORAGE_KEY = "bim_project_schedules";
const PROJECT_SUBCONTRACTORS_STORAGE_KEY = "bim_project_subcontractors";

const defaultProject: WorkspaceProject = {
  id: "default",
  name: "기본 프로젝트",
  description: "아직 프로젝트가 지정되지 않은 IFC 모델을 관리합니다.",
  createdAt: new Date(0).toISOString()
};

const teamMembers: TeamMember[] = [
  {
    id: "hong-minwoo",
    name: "관리자",
    role: "Admin",
    email: "admin@workspace.local"
  },
  {
    id: "project-reviewer",
    name: "Project Reviewer",
    role: "Reviewer",
    email: "reviewer@workspace.local"
  }
];

const dailyReportWorkTemplates = [
  "건축",
  "구조",
  "토목",
  "설비/소방",
  "전기/통신"
];

const dailyReportContractorLaborTemplates = [
  { trade: "직원", role: "관리" },
  { trade: "시공사", role: "공사" },
  { trade: "시공사", role: "안전" }
];

const dailyReportSubcontractorLaborTemplates = [
  { trade: "건축", role: "형틀공" },
  { trade: "구조", role: "철근공" },
  { trade: "설비/소방", role: "배관공" },
  { trade: "전기/통신", role: "전기공" }
];

const dailyReportEquipmentTemplates = [
  { trade: "건축", name: "크레인", spec: "" },
  { trade: "구조", name: "펌프카", spec: "" },
  { trade: "토목", name: "굴착기", spec: "" }
];

const dailyReportMaterialTemplates = [
  { trade: "구조", name: "레미콘", spec: "" },
  { trade: "구조", name: "철근", spec: "" },
  { trade: "건축", name: "H-Beam", spec: "" }
];

const navItems = [
  {
    label: "홈",
    href: "/projects",
    icon: Home
  },
  {
    label: "프로젝트",
    href: "/projects/manage",
    icon: FolderKanban
  },
  {
    label: "팀",
    href: "/team",
    icon: Users
  },
  {
    label: "설정",
    href: "/settings",
    icon: Settings
  }
];

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[100px] bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-4 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]";

const inputClass =
  "h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]";

const textareaClass =
  "min-h-24 resize-none rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]";

const surfaceCardClass = "rounded-2xl border border-[#ebebeb] bg-white";

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "READY":
      return "준비됨";
    case "PROCESSING":
      return "처리 중";
    case "QUEUED":
      return "대기 중";
    case "FAILED":
      return "실패";
    case "UPLOADED":
      return "업로드됨";
    default:
      return status;
  }
}

function getProjectIdForUpload(projectId?: string | null) {
  return !projectId || projectId === defaultProject.id ? null : projectId;
}

function isModelInProject(model: IfcModelSummary, projectId?: string | null) {
  const uploadProjectId = getProjectIdForUpload(projectId);

  return Boolean(uploadProjectId) && model.projectId === uploadProjectId;
}

function getModelsForProject(models: IfcModelSummary[], projectId?: string | null) {
  const uploadProjectId = getProjectIdForUpload(projectId);

  if (!uploadProjectId) {
    return models.filter((model) => !model.projectId);
  }

  return models.filter((model) => model.projectId === uploadProjectId);
}

function getProjectViewerHref(projectId?: string | null) {
  const uploadProjectId = getProjectIdForUpload(projectId);
  return uploadProjectId
    ? `/projects/${encodeURIComponent(uploadProjectId)}/viewer`
    : "/viewer";
}

function canAccessProject(project: WorkspaceProject, currentUser: AuthSessionUser) {
  if (currentUser.role === "admin") {
    return true;
  }

  if (project.id === defaultProject.id) {
    return true;
  }

  return (
    project.owner?.username === currentUser.username ||
    normalizeInvitedMembers(project.invitedMembers).some(
      (member) => member.username === currentUser.username
    )
  );
}

function getProjectOwner(
  project: WorkspaceProject,
  currentUser: AuthSessionUser
): ProjectInvitedMember {
  return (
    project.owner ?? {
      name: currentUser.name,
      username: currentUser.username
    }
  );
}

function normalizeInvitedMembers(
  members: WorkspaceProject["invitedMembers"] | string[] | undefined
): ProjectInvitedMember[] {
  if (!members) {
    return [];
  }

  return members.map((member) =>
    typeof member === "string"
      ? {
          name: member,
          username: member
        }
      : member
  );
}

function getProjectInvitedMemberSummaries(project: WorkspaceProject) {
  return normalizeInvitedMembers(project.invitedMembers);
}

function normalizeProjectLocations(
  locations: WorkspaceProject["locations"] | WorkspaceProject["location"]
) {
  if (!locations) {
    return [];
  }

  const values = Array.isArray(locations) ? locations : [locations];
  const normalized = values
    .map((location) => location.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function getProjectLocations(project: WorkspaceProject | null | undefined) {
  return normalizeProjectLocations(project?.locations ?? project?.location);
}

function getProjectFieldValue(
  project: WorkspaceProject | null | undefined,
  field: keyof WorkspaceProjectEditableFields
) {
  if (field === "locations") {
    return getProjectLocations(project).join("\n");
  }

  const value = project?.[field];

  return typeof value === "string" ? value : "";
}

function hasEditableProjectChanges(
  project: WorkspaceProject | null,
  draft: WorkspaceProject | null
) {
  if (!project || !draft) {
    return false;
  }

  const fields: Array<keyof WorkspaceProjectEditableFields> = [
    "name",
    "description",
    "coverImage",
    "coverImageDisplayHeight",
    "coverImageDisplayWidth",
    "client",
    "contractor",
    "constructionPeriod",
    "etc",
    "inspector",
    "locations",
    "projectNotes",
    "designer"
  ];

  return fields.some(
    (field) => getProjectFieldValue(project, field) !== getProjectFieldValue(draft, field)
  );
}

function formatUploadedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getStoredProjects(currentUser: AuthSessionUser) {
  if (typeof window === "undefined") {
    return [defaultProject];
  }

  const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
  const isDefaultDeleted =
    window.localStorage.getItem(DEFAULT_PROJECT_DELETED_KEY) === "true";

  if (!raw) {
    return isDefaultDeleted ? [] : [defaultProject];
  }

  try {
    const parsed = JSON.parse(raw) as WorkspaceProject[];
    const storedDefaultProject = parsed.find(
      (project) => project.id === defaultProject.id
    );
    const baseProjects = isDefaultDeleted
      ? []
      : [storedDefaultProject ?? defaultProject];

    return [
      ...baseProjects,
      ...parsed.filter((project) => project.id !== defaultProject.id)
    ].map((project) =>
      project.id === defaultProject.id || project.owner
        ? project
        : {
            ...project,
            owner: {
              name: currentUser.name,
              username: currentUser.username
            }
          }
    );
  } catch {
    return isDefaultDeleted ? [] : [defaultProject];
  }
}

function storeProjects(projects: WorkspaceProject[]) {
  window.localStorage.setItem(
    DEFAULT_PROJECT_DELETED_KEY,
    String(!projects.some((project) => project.id === defaultProject.id))
  );
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function canAccessTeam(team: WorkspaceTeam, currentUser: AuthSessionUser) {
  if (currentUser.role === "admin") {
    return true;
  }

  return (
    team.owner.username === currentUser.username ||
    team.members.some((member) => member.username === currentUser.username)
  );
}

function getStoredTeams(currentUser: AuthSessionUser) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(TEAMS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as WorkspaceTeam[];
    return parsed.filter((team) => canAccessTeam(team, currentUser));
  } catch {
    return [];
  }
}

function getAllStoredTeams() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(TEAMS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as WorkspaceTeam[];
  } catch {
    return [];
  }
}

function storeTeams(teams: WorkspaceTeam[]) {
  window.localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
}

function getTodayInputValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localNow.toISOString().slice(0, 10);
}

function formatKoreanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function getLatestDailyReportSchemaSource(reports: ConstructionDailyReport[]) {
  return [...reports].sort((left, right) => {
    const timeDiff = getDailyReportTimeValue(right) - getDailyReportTimeValue(left);

    return timeDiff || right.reportDate.localeCompare(left.reportDate);
  })[0] ?? null;
}

function createDefaultDailyReport(
  project: WorkspaceProject,
  reportDate = getTodayInputValue(),
  sourceReport: ConstructionDailyReport | null = null
): ConstructionDailyReport {
  const now = new Date().toISOString();
  const workItems = sourceReport
    ? sourceReport.workItems.map((item) => ({
        id: crypto.randomUUID(),
        trade: item.trade,
        today: "",
        tomorrow: ""
      }))
    : dailyReportWorkTemplates.map((trade) => ({
        id: crypto.randomUUID(),
        trade,
        today: "",
        tomorrow: ""
      }));
  const contractorLaborRows = sourceReport
    ? getUniqueLaborSchemaRows(
        sourceReport.contractorLaborRows,
        "contractorLaborRows"
      ).map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        role: row.role,
        previous: "",
        today: "0",
        total: ""
      }))
    : dailyReportContractorLaborTemplates.map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        role: row.role,
        previous: "",
        today: "0",
        total: ""
      }));
  const subcontractorLaborRows = sourceReport
    ? getUniqueLaborSchemaRows(
        sourceReport.subcontractorLaborRows,
        "subcontractorLaborRows"
      ).map((row) => ({
        id: crypto.randomUUID(),
        subcontractorName: row.subcontractorName ?? "",
        trade: row.trade,
        role: row.role,
        previous: "",
        today: "0",
        total: ""
      }))
    : dailyReportSubcontractorLaborTemplates.map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        role: row.role,
        previous: "",
        today: "0",
        total: ""
      }));
  const equipmentRows = sourceReport
    ? getUniqueQuantitySchemaRows(sourceReport.equipmentRows).map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        name: row.name,
        spec: row.spec,
        previous: "",
        today: "0",
        total: ""
      }))
    : dailyReportEquipmentTemplates.map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        name: row.name,
        spec: row.spec,
        previous: "",
        today: "0",
        total: ""
      }));
  const materialRows = sourceReport
    ? getUniqueQuantitySchemaRows(sourceReport.materialRows).map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        name: row.name,
        spec: row.spec,
        previous: "",
        today: "0",
        total: ""
      }))
    : dailyReportMaterialTemplates.map((row) => ({
        id: crypto.randomUUID(),
        trade: row.trade,
        name: row.name,
        spec: row.spec,
        previous: "",
        today: "0",
        total: ""
      }));

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    reportDate,
    weather: "맑음",
    lowTemp: "",
    highTemp: "",
    siteManager: getProjectOwner(project, {
      username: project.owner?.username ?? "admin",
      name: project.owner?.name ?? "관리자",
      role: "admin"
    }).name,
    notes: "",
    workItems,
    contractorLaborRows,
    subcontractorLaborRows,
    equipmentRows,
    materialRows,
    photos: [],
    createdAt: now,
    updatedAt: now
  };
}

function normalizeDailyReport(report: ConstructionDailyReport) {
  const normalizeQuantityRows = (
    rows: DailyReportQuantityRow[] | undefined
  ): DailyReportQuantityRow[] =>
    (rows ?? []).map((row) => ({
      ...row,
      trade: row.trade ?? "",
      name: row.name ?? "",
      spec: row.spec ?? "",
      previous: row.previous ?? "",
      today: row.today ?? "",
      total: row.total ?? ""
    }));
  const legacyLaborRows = report.laborRows ?? [];

  return {
    ...report,
    contractorLaborRows: normalizeLaborRows(
      report.contractorLaborRows ?? legacyLaborRows
    ),
    subcontractorLaborRows: normalizeLaborRows(
      report.subcontractorLaborRows ?? []
    ),
    equipmentRows: normalizeQuantityRows(report.equipmentRows),
    materialRows: normalizeQuantityRows(report.materialRows),
    photos: (report.photos ?? []).map((photo) => ({
      ...photo,
      caption: photo.caption ?? "",
      createdAt: photo.createdAt ?? report.createdAt
    }))
  };
}

function normalizeLaborRows(
  rows: DailyReportLaborRow[] | undefined
): DailyReportLaborRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    subcontractorName: row.subcontractorName ?? "",
    trade: row.trade ?? "",
    role: row.role ?? "",
    previous: row.previous ?? "",
    today: row.today ?? "",
    total: row.total ?? ""
  }));
}

function readDailyReports() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DAILY_REPORTS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as ConstructionDailyReport[]).map(normalizeDailyReport);
  } catch {
    return [];
  }
}

function storeDailyReports(reports: ConstructionDailyReport[]) {
  window.localStorage.setItem(DAILY_REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPrintCell(value: string) {
  return escapeHtml(value || "-");
}

function renderPrintTable(
  headers: string[],
  rows: string[][],
  emptyText: string
) {
  if (rows.length === 0) {
    return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td>${renderPrintCell(cell)}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = sanitizeFileName(fileName);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createPdfBlob(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);

  return new Blob([buffer], { type: "application/pdf" });
}

async function createPdfWriter(title: string) {
  const [{ PDFDocument, rgb }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit")
  ]);
  const pdfDoc = await PDFDocument.create();
  const fontkit = fontkitModule.default ?? fontkitModule;

  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await fetch("/fonts/NotoSansCJKkr-Regular.otf").then(
    (response) => {
      if (!response.ok) {
        throw new Error("PDF 한글 폰트를 불러오지 못했습니다.");
      }

      return response.arrayBuffer();
    }
  );
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

  function addPage() {
    page = pdfDoc.addPage(pageSize);
    y = page.getHeight() - margin;
  }

  function ensureSpace(height: number) {
    if (y - height < margin) {
      addPage();
    }
  }

  function textWidth(text: string, size: number) {
    return font.widthOfTextAtSize(text, size);
  }

  function wrapText(text: string, size: number, maxWidth: number) {
    const normalizedText = text || "-";
    const lines: string[] = [];

    for (const paragraph of normalizedText.split("\n")) {
      let line = "";

      for (const char of paragraph || "-") {
        const nextLine = line + char;

        if (textWidth(nextLine, size) <= maxWidth || !line) {
          line = nextLine;
        } else {
          lines.push(line);
          line = char;
        }
      }

      lines.push(line || "-");
    }

    return lines;
  }

  function drawText(
    text: string,
    x: number,
    baseline: number,
    size = 10,
    color = rgb(0.09, 0.09, 0.09)
  ) {
    page.drawText(text || "-", { x, y: baseline, size, font, color });
  }

  function drawParagraph(text: string, options: { size?: number; x?: number; width?: number } = {}) {
    const size = options.size ?? 10;
    const x = options.x ?? margin;
    const width = options.width ?? page.getWidth() - margin * 2;
    const lines = wrapText(text, size, width);
    const lineHeight = size + 5;

    ensureSpace(lines.length * lineHeight + 6);

    for (const line of lines) {
      drawText(line, x, y - size, size);
      y -= lineHeight;
    }
  }

  function drawHeading(text: string, size = 16) {
    ensureSpace(size + 18);
    drawText(text, margin, y - size, size);
    y -= size + 14;
  }

  function drawDocumentTitle(text: string, subtitle?: string) {
    const width = page.getWidth();

    ensureSpace(70);
    page.drawText(text, {
      x: (width - textWidth(text, 18)) / 2,
      y: y - 18,
      size: 18,
      font,
      color: rgb(0.09, 0.09, 0.09)
    });
    y -= 28;

    if (subtitle) {
      page.drawText(subtitle, {
        x: (width - textWidth(subtitle, 10)) / 2,
        y: y - 10,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });
      y -= 18;
    }

    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.09, 0.09, 0.09)
    });
    y -= 18;
  }

  function drawKeyValueGrid(rows: Array<[string, string]>, columns = 2) {
    const gap = 8;
    const width = page.getWidth() - margin * 2;
    const cellWidth = (width - gap * (columns - 1)) / columns;
    const labelWidth = Math.min(88, cellWidth * 0.38);
    const rowHeight = 26;

    for (let index = 0; index < rows.length; index += columns) {
      ensureSpace(rowHeight + 4);

      for (let column = 0; column < columns; column += 1) {
        const row = rows[index + column];

        if (!row) {
          continue;
        }

        const x = margin + column * (cellWidth + gap);
        const [label, value] = row;

        page.drawRectangle({
          x,
          y: y - rowHeight,
          width: cellWidth,
          height: rowHeight,
          borderColor: rgb(0.86, 0.86, 0.86),
          borderWidth: 1,
          color: rgb(0.99, 0.99, 0.99)
        });
        page.drawLine({
          start: { x: x + labelWidth, y },
          end: { x: x + labelWidth, y: y - rowHeight },
          thickness: 1,
          color: rgb(0.9, 0.9, 0.9)
        });
        drawText(label, x + 8, y - 17, 9, rgb(0.28, 0.28, 0.28));
        drawText(value || "-", x + labelWidth + 8, y - 17, 9);
      }

      y -= rowHeight + 6;
    }
  }

  function drawTable(headers: string[], rows: string[][], emptyText: string) {
    if (rows.length === 0) {
      drawParagraph(emptyText, { size: 9 });
      y -= 4;
      return;
    }

    const width = page.getWidth() - margin * 2;
    const columnWidth = width / headers.length;
    const headerHeight = 24;
    const rowHeight = 23;

    ensureSpace(headerHeight + rowHeight);
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width,
      height: headerHeight,
      borderColor: rgb(0.86, 0.86, 0.86),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.98)
    });
    headers.forEach((header, index) => {
      const x = margin + columnWidth * index;

      if (index > 0) {
        page.drawLine({
          start: { x, y },
          end: { x, y: y - headerHeight },
          thickness: 1,
          color: rgb(0.9, 0.9, 0.9)
        });
      }

      drawText(header, x + 6, y - 16, 8, rgb(0.28, 0.28, 0.28));
    });
    y -= headerHeight;

    for (const row of rows) {
      ensureSpace(rowHeight);
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width,
        height: rowHeight,
        borderColor: rgb(0.92, 0.92, 0.92),
        borderWidth: 1
      });
      row.forEach((cell, index) => {
        const x = margin + columnWidth * index;

        if (index > 0) {
          page.drawLine({
            start: { x, y },
            end: { x, y: y - rowHeight },
            thickness: 1,
            color: rgb(0.94, 0.94, 0.94)
          });
        }

        const [line] = wrapText(cell || "-", 8, columnWidth - 12);
        drawText(line, x + 6, y - 15, 8);
      });
      y -= rowHeight;
    }

    y -= 10;
  }

  function drawPageFooter() {
    const pages = pdfDoc.getPages();

    pages.forEach((pdfPage, index) => {
      const footer = `${title} · ${index + 1} / ${pages.length}`;

      pdfPage.drawText(footer, {
        x: margin,
        y: 22,
        size: 8,
        font,
        color: rgb(0.45, 0.45, 0.45)
      });
    });
  }

  async function saveBytes() {
    drawPageFooter();
    return pdfDoc.save();
  }

  return {
    drawDocumentTitle,
    drawHeading,
    drawKeyValueGrid,
    drawParagraph,
    drawTable,
    saveBytes
  };
}

async function downloadDailyReportsPdf(
  project: WorkspaceProject,
  reports: ConstructionDailyReport[]
) {
  if (reports.length === 0) {
    window.alert("PDF로 저장할 공사일보가 없습니다.");
    return;
  }

  const sortedReports = [...reports].sort((left, right) =>
    left.reportDate.localeCompare(right.reportDate)
  );
  const title =
    sortedReports.length === 1
      ? `${sortedReports[0].reportDate} 공사일보`
      : `${sortedReports[0].reportDate}~${
          sortedReports[sortedReports.length - 1].reportDate
        } 공사일보`;
  const writer = await createPdfWriter(title);

  for (const report of sortedReports) {
    const contractorLabor = report.contractorLaborRows.filter(
      hasAnyDailyReportRowValue
    );
    const subcontractorLabor = report.subcontractorLaborRows.filter(
      hasAnyDailyReportRowValue
    );
    const materialRows = report.materialRows.filter(hasAnyDailyReportRowValue);
    const equipmentRows = report.equipmentRows.filter(hasAnyDailyReportRowValue);
    const workItemRows = report.workItems
      .filter((item) => item.today.trim() || item.tomorrow.trim())
      .map((item) => [item.trade, item.today || "-", item.tomorrow || "-"]);

    writer.drawDocumentTitle("공사일보", formatKoreanDate(report.reportDate));
    writer.drawKeyValueGrid([
      ["작성일", report.reportDate],
      ["현장대리인", report.siteManager],
      ["날씨", report.weather],
      ["최저기온", report.lowTemp],
      ["최고기온", report.highTemp]
    ]);
    writer.drawHeading("작업내용", 12);
    writer.drawTable(
      ["공종", "금일 작업", "명일 예정"],
      workItemRows,
      "작성된 작업내용이 없습니다."
    );
    writer.drawHeading("시공사", 12);
    writer.drawTable(
      ["공종", "직종", "전일", "금일", "누계"],
      contractorLabor.map((row) => [
        row.trade,
        row.role,
        row.previous || "0",
        row.today || "0",
        row.total || "0"
      ]),
      "작성된 시공사 현황이 없습니다."
    );
    writer.drawHeading("협력사", 12);
    writer.drawTable(
      ["협력사명", "공종", "직종", "전일", "금일", "누계"],
      subcontractorLabor.map((row) => [
        row.subcontractorName || "-",
        row.trade,
        row.role,
        row.previous || "0",
        row.today || "0",
        row.total || "0"
      ]),
      "작성된 협력사 작업자 현황이 없습니다."
    );
    writer.drawHeading("자재 입고현황", 12);
    writer.drawTable(
      ["공종", "자재명", "규격", "전일", "금일", "누계"],
      createGroupedQuantityDisplayRows(materialRows),
      "작성된 자재 입고현황이 없습니다."
    );
    writer.drawHeading("장비 현황", 12);
    writer.drawTable(
      ["공종", "장비명", "규격", "전일", "금일", "누계"],
      equipmentRows.map((row) => [
        row.trade,
        row.name,
        row.spec || "-",
        row.previous || "0",
        row.today || "0",
        row.total || "0"
      ]),
      "작성된 장비 현황이 없습니다."
    );
    writer.drawHeading("특기사항", 12);
    writer.drawParagraph(report.notes.trim() || "작성된 특기사항이 없습니다.", {
      size: 9
    });
  }

  const bytes = await writer.saveBytes();
  downloadBlob(createPdfBlob(bytes), `${title}.pdf`);
}

async function downloadInspectionRequestPdf(
  project: WorkspaceProject,
  document: ProjectDocumentListItem,
  inspectionRequest: InspectionRequestDocumentData
) {
  const title = document.title || `${inspectionRequest.inspectionRequestDate} 검측요청서`;
  const writer = await createPdfWriter(title);

  writer.drawDocumentTitle("검 측 요 청 서");
  writer.drawKeyValueGrid(
    [
      ["번호", inspectionRequest.requestNo],
      ["수신", inspectionRequest.recipient],
      ["위치 및 공종", inspectionRequest.locationAndTrade],
      ["검측 부위", inspectionRequest.inspectionPart],
      ["검측 요구 일시", inspectionRequest.inspectionRequestDate],
      ["검측 사항", inspectionRequest.inspectionSummary],
      ["첨부", inspectionRequest.attachmentText]
    ],
    1
  );
  writer.drawParagraph(
    "다음과 같은 세부공종에 대하여 검측요청하오니 검사 후 승인하여 주시기 바랍니다.",
    { size: 9 }
  );
  writer.drawKeyValueGrid(
    [
      ["공사명", inspectionRequest.constructionName],
      ["현장대리인", `${inspectionRequest.siteManager || "-"} (인)`]
    ],
    1
  );
  writer.drawHeading("검 측 결 과 통 보 서", 12);
  writer.drawParagraph(
    `검측요청서 번호 ${inspectionRequest.requestNo || "-"}에 대한 검측결과를 통보합니다.`,
    { size: 9 }
  );
  writer.drawKeyValueGrid(
    [
      ["수신", inspectionRequest.resultRecipient],
      ["검측일자", inspectionRequest.inspectionRequestDate],
      ["첨부", inspectionRequest.resultAttachmentText],
      ["총괄 감리 책임자", `${inspectionRequest.supervisingInspector || "-"} (인)`]
    ],
    1
  );
  writer.drawHeading("검 측 체 크 리 스 트", 12);
  writer.drawKeyValueGrid(
    [
      ["공종 CODE No.", inspectionRequest.requestNo],
      ["검측일자", inspectionRequest.requestPeriod],
      ["공종", inspectionRequest.checklist.trade],
      ["위치 및 부위", inspectionRequest.inspectionPart],
      ["세부공종", inspectionRequest.checklist.subTrade],
      ["도면번호", inspectionRequest.checklist.drawingNumber]
    ],
    2
  );
  writer.drawTable(
    ["검사항목", "검사기준", "시공자1", "시공자2", "감리자1", "감리자2", "조치"],
    inspectionRequest.checklist.rows.map((row) => [
      row.item,
      row.standard,
      row.contractorFirst ?? "",
      row.contractorSecond ?? "",
      row.supervisorFirst ?? "",
      row.supervisorSecond ?? "",
      row.action ?? ""
    ]),
    "작성된 검측 체크리스트가 없습니다."
  );
  writer.drawKeyValueGrid(
    [
      ["시공자 점검", "성명 (인)"],
      ["감리원 검측", "성명 (인)"],
      ["시공자 재점검", "성명 (인)"],
      ["감리원 재검측", "성명 (인)"]
    ],
    2
  );
  writer.drawParagraph("※ 검측사진첨부.", { size: 8 });

  const bytes = await writer.saveBytes();
  downloadBlob(createPdfBlob(bytes), `${title}.pdf`);
}

function renderDailyReportPrintHtml(report: ConstructionDailyReport) {
  const contractorLabor = report.contractorLaborRows.filter(hasAnyDailyReportRowValue);
  const subcontractorLabor = report.subcontractorLaborRows.filter(
    hasAnyDailyReportRowValue
  );
  const materialRows = report.materialRows.filter(hasAnyDailyReportRowValue);
  const equipmentRows = report.equipmentRows.filter(hasAnyDailyReportRowValue);
  const workItemRows = report.workItems
    .filter((item) => item.today.trim() || item.tomorrow.trim())
    .map((item) => [item.trade, item.today || "-", item.tomorrow || "-"]);
  const photoHtml =
    report.photos.length > 0
      ? `<div class="photos">${report.photos
          .map(
            (photo, index) => `
              <figure>
                <img src="${escapeHtml(photo.dataUrl)}" alt="${escapeHtml(
                  photo.caption || photo.fileName || `현장사진 ${index + 1}`
                )}" />
                <figcaption>${escapeHtml(
                  photo.caption || photo.fileName || `현장사진 ${index + 1}`
                )}</figcaption>
              </figure>
            `
          )
          .join("")}</div>`
      : `<div class="empty">첨부된 현장사진이 없습니다.</div>`;

  return `
    <article class="print-document daily-report">
      <header>
        <h1>공사일보</h1>
        <p>${escapeHtml(formatKoreanDate(report.reportDate))}</p>
      </header>

      <section class="fields">
        <div><strong>작성일</strong><span>${escapeHtml(report.reportDate)}</span></div>
        <div><strong>현장대리인</strong><span>${renderPrintCell(report.siteManager)}</span></div>
        <div><strong>날씨</strong><span>${renderPrintCell(report.weather)}</span></div>
        <div><strong>최저기온</strong><span>${renderPrintCell(report.lowTemp)}</span></div>
        <div><strong>최고기온</strong><span>${renderPrintCell(report.highTemp)}</span></div>
      </section>

      <section>
        <h2>작업내용</h2>
        ${renderPrintTable(
          ["공종", "금일 작업", "명일 예정"],
          workItemRows,
          "작성된 작업내용이 없습니다."
        )}
      </section>

      <section>
        <h2>시공사</h2>
        ${renderPrintTable(
          ["공종", "직종", "전일", "금일", "누계"],
          contractorLabor.map((row) => [
            row.trade,
            row.role,
            row.previous || "0",
            row.today || "0",
            row.total || "0"
          ]),
          "작성된 시공사 현황이 없습니다."
        )}
      </section>

      <section>
        <h2>협력사</h2>
        ${renderPrintTable(
          ["협력사명", "공종", "직종", "전일", "금일", "누계"],
          subcontractorLabor.map((row) => [
            row.subcontractorName || "-",
            row.trade,
            row.role,
            row.previous || "0",
            row.today || "0",
            row.total || "0"
          ]),
          "작성된 협력사 작업자 현황이 없습니다."
        )}
      </section>

      <section>
        <h2>자재 입고현황</h2>
        ${renderPrintTable(
          ["공종", "자재명", "규격", "전일", "금일", "누계"],
          createGroupedQuantityDisplayRows(materialRows),
          "작성된 자재 입고현황이 없습니다."
        )}
      </section>

      <section>
        <h2>장비 현황</h2>
        ${renderPrintTable(
          ["공종", "장비명", "규격", "전일", "금일", "누계"],
          equipmentRows.map((row) => [
            row.trade,
            row.name,
            row.spec || "-",
            row.previous || "0",
            row.today || "0",
            row.total || "0"
          ]),
          "작성된 장비 현황이 없습니다."
        )}
      </section>

      <section>
        <h2>현장사진</h2>
        ${photoHtml}
      </section>

      <section>
        <h2>특기사항</h2>
        <div class="notes">${escapeHtml(
          report.notes.trim() || "작성된 특기사항이 없습니다."
        )}</div>
      </section>
    </article>
  `;
}

function renderInspectionRequestPrintHtml(data: InspectionRequestDocumentData) {
  return `
    <article class="print-document inspection-request">
      <header>
        <h1>검 측 요 청 서</h1>
      </header>

      <section class="inspection-fields">
        ${[
          ["번호", data.requestNo],
          ["수신", data.recipient],
          ["위치 및 공종", data.locationAndTrade],
          ["검측 부위", data.inspectionPart],
          ["검측 요구 일시", data.inspectionRequestDate],
          ["검측 사항", data.inspectionSummary],
          ["첨부", data.attachmentText]
        ]
          .map(
            ([label, value]) => `
              <div>
                <strong>${escapeHtml(label)}</strong>
                <span>${renderPrintCell(value)}</span>
              </div>
            `
          )
          .join("")}
      </section>

      <p class="description">
        다음과 같은 세부공종에 대하여 검측요청하오니 검사 후 승인하여
        주시기 바랍니다.
      </p>

      <section class="signature-fields">
        <p><strong>공사명 :</strong> ${renderPrintCell(data.constructionName)}</p>
        <p><strong>현장대리인 :</strong> ${renderPrintCell(data.siteManager)} (인)</p>
      </section>

      <section class="result-section">
        <h2>검 측 결 과 통 보 서</h2>
        <p>검측요청서 번호 ${renderPrintCell(data.requestNo)}에 대한 검측결과를 통보합니다.</p>
        <p><strong>수신 :</strong> ${renderPrintCell(data.resultRecipient)}</p>
        <p><strong>검측일자 :</strong> ${renderPrintCell(data.inspectionRequestDate)}</p>
        <p><strong>첨부 :</strong> ${renderPrintCell(data.resultAttachmentText)}</p>
        <p><strong>총괄 감리 책임자 :</strong> ${renderPrintCell(data.supervisingInspector)} (인)</p>
      </section>

      <section class="checklist-section">
        <h2>검 측 체 크 리 스 트</h2>
        <div class="checklist-meta">
          ${[
            ["공종 CODE No.", data.requestNo],
            ["검측일자", data.requestPeriod],
            ["공종", data.checklist.trade],
            ["위치 및 부위", data.inspectionPart],
            ["세부공종", data.checklist.subTrade],
            ["도면번호", data.checklist.drawingNumber]
          ]
            .map(
              ([label, value]) => `
                <div>
                  <strong>${escapeHtml(label)}</strong>
                  <span>${renderPrintCell(value)}</span>
                </div>
              `
            )
            .join("")}
        </div>
        <table class="checklist-table">
          <thead>
            <tr>
              <th rowspan="2">검사항목</th>
              <th rowspan="2">검사기준</th>
              <th colspan="2">시공자</th>
              <th colspan="2">감리자</th>
              <th rowspan="2">조치사항</th>
            </tr>
            <tr>
              <th>1차</th>
              <th>2차</th>
              <th>1차</th>
              <th>2차</th>
            </tr>
          </thead>
          <tbody>
            ${data.checklist.rows
              .map(
                (row) => `
                  <tr>
                    <td>${renderPrintCell(row.item)}</td>
                    <td>${renderPrintCell(row.standard)}</td>
                    <td>${renderPrintCell(row.contractorFirst ?? "")}</td>
                    <td>${renderPrintCell(row.contractorSecond ?? "")}</td>
                    <td>${renderPrintCell(row.supervisorFirst ?? "")}</td>
                    <td>${renderPrintCell(row.supervisorSecond ?? "")}</td>
                    <td>${renderPrintCell(row.action ?? "")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <div class="approval-grid">
          <div>시공자 점검 : 성명 (인)</div>
          <div>감리원 검측 : 성명 (인)</div>
          <div>시공자 재점검 : 성명 (인)</div>
          <div>감리원 재검측 : 성명 (인)</div>
        </div>
        <p class="caption">※ 검측사진첨부.</p>
      </section>
    </article>
  `;
}

function openPrintDocument({
  bodyHtml,
  project,
  title
}: {
  bodyHtml: string;
  project: WorkspaceProject;
  title: string;
}) {
  const printWindow = window.open("about:blank", "_blank");

  if (!printWindow) {
    window.alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
    return;
  }

  printWindow.opener = null;
  printWindow.document.write(`<!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(project.name)} ${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f7f7f7;
            color: #171717;
            font-family: Arial, "Malgun Gothic", sans-serif;
          }
          .print-root {
            padding: 24px;
          }
          .project-title {
            margin: 0 auto 16px;
            max-width: 900px;
            font-size: 13px;
            color: #4d4d4d;
          }
          .print-document {
            max-width: 900px;
            margin: 0 auto 24px;
            padding: 24px;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            background: #fff;
            page-break-after: always;
          }
          .print-document:last-child {
            page-break-after: auto;
          }
          header {
            border-bottom: 1px solid #171717;
            padding-bottom: 18px;
            text-align: center;
          }
          h1 {
            margin: 0;
            font-size: 24px;
          }
          header p {
            margin: 10px 0 0;
            font-size: 14px;
            color: #4d4d4d;
          }
          section {
            margin-top: 22px;
          }
          h2 {
            margin: 0 0 8px;
            font-size: 14px;
          }
          .fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 12px;
          }
          .fields div,
          .inspection-fields div,
          .checklist-meta div {
            display: grid;
            grid-template-columns: 120px 1fr;
            border: 1px solid #ebebeb;
            overflow: hidden;
          }
          .fields div {
            border-radius: 6px;
          }
          .fields strong,
          .inspection-fields strong,
          .checklist-meta strong {
            padding: 10px 12px;
            background: #fcfcfc;
            color: #4d4d4d;
            font-size: 13px;
          }
          .fields span,
          .inspection-fields span,
          .checklist-meta span {
            padding: 10px 12px;
            font-size: 13px;
            white-space: pre-wrap;
          }
          .inspection-fields,
          .checklist-meta {
            display: grid;
            gap: 0;
            border: 1px solid #171717;
          }
          .inspection-fields div,
          .checklist-meta div {
            border-width: 0 0 1px;
          }
          .inspection-fields div:last-child,
          .checklist-meta div:last-child {
            border-bottom: 0;
          }
          .description,
          .signature-fields p,
          .result-section p,
          .caption {
            font-size: 13px;
            line-height: 1.7;
            color: #4d4d4d;
          }
          .result-section {
            border-top: 1px solid #171717;
            padding-top: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ebebeb;
            font-size: 12px;
          }
          th {
            background: #fcfcfc;
            color: #4d4d4d;
            font-weight: 600;
            text-align: left;
          }
          th, td {
            border-bottom: 1px solid #f2f2f2;
            padding: 8px 10px;
            vertical-align: top;
          }
          .checklist-table th,
          .checklist-table td {
            border: 1px solid #d7d7d7;
          }
          .empty, .notes {
            min-height: 48px;
            border: 1px solid #ebebeb;
            border-radius: 6px;
            background: #fcfcfc;
            padding: 14px;
            color: #4d4d4d;
            font-size: 13px;
            white-space: pre-wrap;
          }
          .photos {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          figure {
            margin: 0;
            border: 1px solid #ebebeb;
            border-radius: 8px;
            overflow: hidden;
          }
          figure img {
            display: block;
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: cover;
            background: #f2f2f2;
          }
          figcaption {
            border-top: 1px solid #ebebeb;
            padding: 8px 10px;
            font-size: 12px;
            color: #4d4d4d;
          }
          .approval-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
            font-size: 13px;
          }
          .approval-grid div {
            border: 1px solid #d7d7d7;
            border-radius: 6px;
            padding: 12px;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
          @media print {
            body { background: #fff; }
            .print-root { padding: 0; }
            .project-title { max-width: none; }
            .print-document {
              max-width: none;
              margin: 0;
              border: 0;
              border-radius: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="print-root">
          <p class="project-title">${escapeHtml(project.name)} · ${escapeHtml(
            title
          )}</p>
          ${bodyHtml}
        </main>
        <script>
          async function waitForPrintAssets() {
            if (document.fonts && document.fonts.ready) {
              await document.fonts.ready.catch(() => undefined);
            }
            const images = Array.from(document.images);
            await Promise.all(images.map((image) => {
              if (image.complete) return Promise.resolve();
              return new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              });
            }));
          }
          async function startPrint() {
            await waitForPrintAssets();
            setTimeout(() => {
              window.focus();
              window.print();
            }, 300);
          }
          if (document.readyState === "complete") {
            startPrint();
          } else {
            window.addEventListener("load", startPrint, { once: true });
          }
        </script>
      </body>
    </html>`);
  printWindow.document.close();
}

function printDailyReportsAsPdf(
  project: WorkspaceProject,
  reports: ConstructionDailyReport[]
) {
  if (reports.length === 0) {
    window.alert("PDF로 저장할 공사일보가 없습니다.");
    return;
  }

  const sortedReports = [...reports].sort((left, right) =>
    left.reportDate.localeCompare(right.reportDate)
  );
  const title =
    sortedReports.length === 1
      ? `${sortedReports[0].reportDate} 공사일보`
      : `${sortedReports[0].reportDate}~${
          sortedReports[sortedReports.length - 1].reportDate
        } 공사일보`;

  openPrintDocument({
    bodyHtml: sortedReports.map(renderDailyReportPrintHtml).join(""),
    project,
    title
  });
}

function printInspectionRequestAsPdf(
  project: WorkspaceProject,
  document: ProjectDocumentListItem,
  inspectionRequest: InspectionRequestDocumentData
) {
  openPrintDocument({
    bodyHtml: renderInspectionRequestPrintHtml(inspectionRequest),
    project,
    title: document.title || `${inspectionRequest.inspectionRequestDate} 검측요청서`
  });
}

function getDailyReportTimeValue(report: ConstructionDailyReport) {
  return new Date(report.updatedAt || report.createdAt || report.reportDate).getTime();
}

function collectProjectLaborSchemaRows(
  reports: ConstructionDailyReport[],
  collection: DailyReportLaborCollection
) {
  const sourceReport = getLatestDailyReportSchemaSource(reports);

  return getUniqueLaborSchemaRows(sourceReport?.[collection] ?? [], collection);
}

function getUniqueLaborSchemaRows(
  rows: DailyReportLaborRow[],
  collection: DailyReportLaborCollection
) {
  const schemaRows: DailyReportLaborRow[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const key = getLaborRowMatchKey(row, collection);

    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    schemaRows.push(row);
  }

  return schemaRows;
}

function collectProjectQuantitySchemaRows(
  reports: ConstructionDailyReport[],
  collection: DailyReportQuantityCollection
) {
  const sourceReport = getLatestDailyReportSchemaSource(reports);

  return getUniqueQuantitySchemaRows(sourceReport?.[collection] ?? []);
}

function getUniqueQuantitySchemaRows(rows: DailyReportQuantityRow[]) {
  const schemaRows: DailyReportQuantityRow[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const key = getQuantityRowMatchKey(row);

    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    schemaRows.push(row);
  }

  return schemaRows;
}

function syncLaborRowsToSchema(
  laborRows: DailyReportLaborRow[],
  schemaRows: DailyReportLaborRow[],
  collection: DailyReportLaborCollection
) {
  const existingRows = new Map(
    laborRows
      .map((row) => [getLaborRowMatchKey(row, collection), row] as const)
      .filter(([key]) => Boolean(key))
  );

  return [
    ...schemaRows.map((schemaRow) => {
      const existingRow = existingRows.get(
        getLaborRowMatchKey(schemaRow, collection)
      );

      return {
        id: existingRow?.id ?? crypto.randomUUID(),
        subcontractorName:
          collection === "subcontractorLaborRows"
            ? schemaRow.subcontractorName ?? ""
            : "",
        trade: schemaRow.trade,
        role: schemaRow.role,
        previous: existingRow?.previous ?? "",
        today: existingRow?.today ?? "0",
        total: existingRow?.total ?? ""
      };
    }),
    ...laborRows.filter((row) => !getLaborRowMatchKey(row, collection))
  ];
}

function syncQuantityRowsToSchema(
  quantityRows: DailyReportQuantityRow[],
  schemaRows: DailyReportQuantityRow[]
) {
  const existingRows = new Map(
    quantityRows
      .map((row) => [getQuantityRowMatchKey(row), row] as const)
      .filter(([key]) => Boolean(key))
  );

  return [
    ...schemaRows.map((schemaRow) => {
      const existingRow = existingRows.get(getQuantityRowMatchKey(schemaRow));

      return {
        id: existingRow?.id ?? crypto.randomUUID(),
        trade: schemaRow.trade,
        name: schemaRow.name,
        spec: schemaRow.spec,
        previous: existingRow?.previous ?? "",
        today: existingRow?.today ?? "0",
        total: existingRow?.total ?? ""
      };
    }),
    ...quantityRows.filter((row) => !getQuantityRowMatchKey(row))
  ];
}

function recalculateProjectDailyReports(reports: ConstructionDailyReport[]) {
  const ascendingReports = [...reports].sort(
    (left, right) =>
      new Date(left.reportDate).getTime() - new Date(right.reportDate).getTime()
  );
  const calculatedReports = ascendingReports.reduce<ConstructionDailyReport[]>(
    (calculated, report) => [
      ...calculated,
      applyDailyReportTotals(report, getPreviousDailyReport(calculated, report))
    ],
    []
  );

  return calculatedReports.sort(
    (left, right) =>
      new Date(right.reportDate).getTime() - new Date(left.reportDate).getTime()
  );
}

function syncProjectDailyReports(
  reports: ConstructionDailyReport[],
  schemas: DailyReportSyncSchemas = {}
) {
  const contractorLaborRows =
    getUniqueLaborSchemaRows(
      schemas.contractorLaborRows ??
        collectProjectLaborSchemaRows(reports, "contractorLaborRows"),
      "contractorLaborRows"
    );
  const subcontractorLaborRows =
    getUniqueLaborSchemaRows(
      schemas.subcontractorLaborRows ??
        collectProjectLaborSchemaRows(reports, "subcontractorLaborRows"),
      "subcontractorLaborRows"
    );
  const equipmentRows =
    getUniqueQuantitySchemaRows(
      schemas.equipmentRows ??
        collectProjectQuantitySchemaRows(reports, "equipmentRows")
    );
  const materialRows =
    getUniqueQuantitySchemaRows(
      schemas.materialRows ??
        collectProjectQuantitySchemaRows(reports, "materialRows")
    );

  return recalculateProjectDailyReports(
    reports.map((report) => ({
      ...report,
      contractorLaborRows: syncLaborRowsToSchema(
        report.contractorLaborRows,
        contractorLaborRows,
        "contractorLaborRows"
      ),
      subcontractorLaborRows: syncLaborRowsToSchema(
        report.subcontractorLaborRows,
        subcontractorLaborRows,
        "subcontractorLaborRows"
      ),
      equipmentRows: syncQuantityRowsToSchema(report.equipmentRows, equipmentRows),
      materialRows: syncQuantityRowsToSchema(report.materialRows, materialRows)
    }))
  );
}

function getProjectDailyReports(projectId: string) {
  const projectReports = readDailyReports()
    .filter((report) => report.projectId === projectId);

  return syncProjectDailyReports(projectReports);
}

function normalizeProjectSubcontractor(
  item: ProjectSubcontractor
): ProjectSubcontractor {
  const normalizedManagerNames =
    item.managerNames?.filter((name) => name.trim()).map((name) => name.trim()) ??
    [];
  const managerNames =
    normalizedManagerNames.length > 0
      ? normalizedManagerNames
      : item.managerName
        ? [item.managerName]
        : [];

  return {
    ...item,
    companyName: item.companyName ?? "",
    managerName: managerNames.join(", "),
    managerNames,
    trade: item.trade ?? "",
    contractAmount: item.contractAmount ?? "",
    contractStartDate: item.contractStartDate ?? "",
    contractEndDate: item.contractEndDate ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    notes: item.notes ?? "",
    documents: (item.documents ?? []).map((document) => ({
      ...document,
      fileType: document.fileType ?? "application/octet-stream",
      fileSize: Number(document.fileSize ?? 0),
      uploadedAt: document.uploadedAt ?? item.createdAt
    }))
  };
}

function readProjectSubcontractors() {
  if (typeof window === "undefined") {
    return [] as ProjectSubcontractor[];
  }

  const raw = window.localStorage.getItem(PROJECT_SUBCONTRACTORS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as ProjectSubcontractor[]).map(
      normalizeProjectSubcontractor
    );
  } catch {
    return [];
  }
}

function storeProjectSubcontractors(subcontractors: ProjectSubcontractor[]) {
  window.localStorage.setItem(
    PROJECT_SUBCONTRACTORS_STORAGE_KEY,
    JSON.stringify(subcontractors)
  );
}

function getProjectSubcontractors(projectId: string) {
  return readProjectSubcontractors()
    .filter((item) => item.projectId === projectId)
    .sort((left, right) => left.companyName.localeCompare(right.companyName));
}

function getProjectSubcontractorNames(projectId: string) {
  return getProjectSubcontractors(projectId).map((item) => item.companyName);
}

function formatDailyReportNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value);
}

function getPreviousDailyReport(
  reports: ConstructionDailyReport[],
  report: ConstructionDailyReport
) {
  return reports
    .filter(
      (item) => item.id !== report.id && item.reportDate < report.reportDate
    )
    .sort((left, right) => right.reportDate.localeCompare(left.reportDate))[0] ?? null;
}

function getLaborRowMatchKey(
  row: DailyReportLaborRow,
  collection: "contractorLaborRows" | "subcontractorLaborRows"
) {
  const trade = row.trade.trim();
  const role = row.role.trim();
  const subcontractorName = row.subcontractorName?.trim() ?? "";

  if (!trade || !role) {
    return "";
  }

  if (collection === "subcontractorLaborRows") {
    return subcontractorName ? `${subcontractorName}::${trade}::${role}` : "";
  }

  return `${trade}::${role}`;
}

function getPreviousLaborTotal(
  previousReport: ConstructionDailyReport | null,
  collection: "contractorLaborRows" | "subcontractorLaborRows",
  row: DailyReportLaborRow
) {
  const key = getLaborRowMatchKey(row, collection);

  if (!previousReport || !key) {
    return "";
  }

  const previousRow = previousReport[collection].find(
    (item) => getLaborRowMatchKey(item, collection) === key
  );

  if (!previousRow) {
    return "";
  }

  return (
    previousRow.total ||
    formatDailyReportNumber(
      parseDashboardNumber(previousRow.previous) +
        parseDashboardNumber(previousRow.today)
    )
  );
}

function applyDailyReportLaborTotals(
  report: ConstructionDailyReport,
  previousReport: ConstructionDailyReport | null
) {
  const normalizeRow = (
    collection: "contractorLaborRows" | "subcontractorLaborRows",
    row: DailyReportLaborRow
  ) => {
    const previous = getPreviousLaborTotal(previousReport, collection, row);
    const totalSource = parseDashboardNumber(previous) + parseDashboardNumber(row.today);

    return {
      ...row,
      previous,
      total:
        previous || row.today.trim()
          ? formatDailyReportNumber(totalSource)
          : ""
    };
  };

  return {
    ...report,
    contractorLaborRows: report.contractorLaborRows.map((row) =>
      normalizeRow("contractorLaborRows", row)
    ),
    subcontractorLaborRows: report.subcontractorLaborRows.map((row) =>
      normalizeRow("subcontractorLaborRows", row)
    )
  };
}

function getQuantityRowMatchKey(row: DailyReportQuantityRow) {
  const trade = row.trade.trim();
  const name = row.name.trim();
  const spec = row.spec.trim();

  if (!trade || !name) {
    return "";
  }

  return `${trade}::${name}::${spec}`;
}

function getQuantityRowGroupKey(row: DailyReportQuantityRow) {
  const trade = row.trade.trim();
  const name = row.name.trim();

  return trade && name ? `${trade}::${name}` : "";
}

function groupDailyReportQuantityRows(rows: DailyReportQuantityRow[]) {
  const groupOrder = new Map<string, number>();

  return rows
    .map((row, index) => {
      const key = getQuantityRowGroupKey(row) || `__row_${index}`;

      if (!groupOrder.has(key)) {
        groupOrder.set(key, index);
      }

      return {
        groupIndex: groupOrder.get(key) ?? index,
        index,
        row
      };
    })
    .sort(
      (left, right) =>
        left.groupIndex - right.groupIndex || left.index - right.index
    )
    .map((item) => item.row);
}

function createGroupedQuantityDisplayRows(rows: DailyReportQuantityRow[]) {
  let previousKey = "";

  return groupDailyReportQuantityRows(rows).map((row) => {
    const key = getQuantityRowGroupKey(row);
    const isRepeatedGroup = Boolean(key) && key === previousKey;

    previousKey = key;

    return [
      isRepeatedGroup ? "" : row.trade,
      isRepeatedGroup ? "" : row.name,
      row.spec || "-",
      row.previous || "0",
      row.today || "0",
      row.total || "0"
    ];
  });
}

function getPreviousQuantityTotal(
  previousReport: ConstructionDailyReport | null,
  collection: "materialRows" | "equipmentRows",
  row: DailyReportQuantityRow
) {
  const key = getQuantityRowMatchKey(row);

  if (!previousReport || !key) {
    return "";
  }

  const previousRow = previousReport[collection].find(
    (item) => getQuantityRowMatchKey(item) === key
  );

  if (!previousRow) {
    return "";
  }

  return (
    previousRow.total ||
    formatDailyReportNumber(
      parseDashboardNumber(previousRow.previous) +
        parseDashboardNumber(previousRow.today)
    )
  );
}

function applyDailyReportQuantityTotals(
  report: ConstructionDailyReport,
  previousReport: ConstructionDailyReport | null
) {
  const normalizeRow = (
    collection: "materialRows" | "equipmentRows",
    row: DailyReportQuantityRow
  ) => {
    const previous = getPreviousQuantityTotal(previousReport, collection, row);
    const totalSource = parseDashboardNumber(previous) + parseDashboardNumber(row.today);

    return {
      ...row,
      previous,
      total:
        previous || row.today.trim()
          ? formatDailyReportNumber(totalSource)
          : ""
    };
  };

  return {
    ...report,
    materialRows: report.materialRows.map((row) =>
      normalizeRow("materialRows", row)
    ),
    equipmentRows: report.equipmentRows.map((row) =>
      normalizeRow("equipmentRows", row)
    )
  };
}

function applyDailyReportTotals(
  report: ConstructionDailyReport,
  previousReport: ConstructionDailyReport | null
) {
  return applyDailyReportQuantityTotals(
    applyDailyReportLaborTotals(report, previousReport),
    previousReport
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("파일을 읽지 못했습니다."));
    };
    reader.readAsDataURL(file);
  });
}

function normalizeProjectScheduleItem(item: ProjectScheduleItem) {
  return {
    ...item,
    progress: Number.isFinite(item.progress)
      ? Math.max(0, Math.min(100, item.progress))
      : 0
  };
}

function readProjectSchedules() {
  if (typeof window === "undefined") {
    return [] as ProjectScheduleItem[];
  }

  const raw = window.localStorage.getItem(PROJECT_SCHEDULES_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as ProjectScheduleItem[]).map(
      normalizeProjectScheduleItem
    );
  } catch {
    return [];
  }
}

function storeProjectSchedules(schedules: ProjectScheduleItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROJECT_SCHEDULES_STORAGE_KEY,
    JSON.stringify(schedules)
  );
}

function getProjectSchedules(projectId: string) {
  return readProjectSchedules()
    .filter((schedule) => schedule.projectId === projectId)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function calculateScheduleProgress(
  startDate: string,
  endDate: string,
  asOfDate = getTodayInputValue()
) {
  if (asOfDate < startDate) {
    return 0;
  }

  if (asOfDate >= endDate) {
    return 100;
  }

  const startTime = new Date(`${startDate}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T00:00:00`).getTime();
  const asOfTime = new Date(`${asOfDate}T00:00:00`).getTime();
  const totalDays = Math.max(1, (endTime - startTime) / 86_400_000);
  const elapsedDays = Math.max(0, (asOfTime - startTime) / 86_400_000);

  return Math.round((elapsedDays / totalDays) * 100);
}

function getInputDateTime(value: string) {
  const time = new Date(`${value}T00:00:00`).getTime();

  return Number.isFinite(time) ? time : null;
}

function getProjectScheduleProgress(items: ProjectScheduleItem[], asOfDate: string) {
  const asOfTime = getInputDateTime(asOfDate);
  const progressItems = items.filter((item) => !isScheduleSummaryItem(item));

  if (!asOfTime || progressItems.length === 0) {
    return 0;
  }

  const totals = progressItems.reduce(
    (total, item) => {
      const startTime = getInputDateTime(item.startDate);
      const rawEndTime = getInputDateTime(item.endDate);

      if (!startTime || !rawEndTime) {
        return total;
      }

      const endTime = Math.max(startTime, rawEndTime);
      const plannedDays =
        Math.max(0, Math.round((endTime - startTime) / 86_400_000)) + 1;
      const completedDays =
        asOfTime < startTime
          ? 0
          : asOfTime >= endTime
          ? plannedDays
          : Math.min(
              plannedDays,
              Math.max(0, Math.round((asOfTime - startTime) / 86_400_000)) + 1
            );

      return {
        completedDays: total.completedDays + completedDays,
        plannedDays: total.plannedDays + plannedDays
      };
    },
    { completedDays: 0, plannedDays: 0 }
  );

  if (totals.plannedDays === 0) {
    return 0;
  }

  return Math.round((totals.completedDays / totals.plannedDays) * 100);
}

function getProjectConstructionPeriodSummary(
  constructionPeriod: string | undefined,
  asOfDate: string
) {
  const { endDate, startDate } = parseDateRangeValue(constructionPeriod ?? "");
  const startTime = startDate ? getInputDateTime(startDate) : null;
  const endTime = endDate ? getInputDateTime(endDate) : null;
  const asOfTime = getInputDateTime(asOfDate);

  if (!startDate || !endDate || !startTime || !endTime || !asOfTime) {
    return null;
  }

  const normalizedEndTime = Math.max(startTime, endTime);
  const elapsedDays =
    asOfTime < startTime
      ? 0
      : Math.max(0, Math.floor((asOfTime - startTime) / 86_400_000)) + 1;
  const remainingDays =
    asOfTime >= normalizedEndTime
      ? 0
      : Math.max(0, Math.ceil((normalizedEndTime - asOfTime) / 86_400_000));

  return {
    elapsedDays,
    endDate,
    remainingDays,
    startDate
  };
}

function formatInputDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function addDaysToInputDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatInputDate(date);
}

function getInclusiveDayCount(startDate: string, endDate: string) {
  const startTime = new Date(`${startDate}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T00:00:00`).getTime();

  return Math.max(1, Math.round((endTime - startTime) / 86_400_000) + 1);
}

function sanitizeFileName(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "project"
  );
}

function normalizeCellText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return formatInputDate(value);
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function parseSpreadsheetDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatInputDate(value);
  }

  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const date = new Date(Math.round((value - 25_569) * 86_400_000));
    return date.toISOString().slice(0, 10);
  }

  const text = normalizeCellText(value);
  const datePrefix = text.match(/^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})(?:\s|$)/);

  if (datePrefix && datePrefix[1] !== text) {
    return parseSpreadsheetDate(datePrefix[1]);
  }

  const yearFirst = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);

  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (monthFirst) {
    const [, month, day, rawYear] = monthFirst;
    const year =
      rawYear.length === 2 ? String(2000 + Number(rawYear)) : rawYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function isActiveScheduleCell(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && Math.abs(value) > 0.000_001;
  }

  const text = normalizeCellText(value);

  if (!text || text === "-" || text === "0") {
    return false;
  }

  const numericText = text.replace(/[,\s원%]/g, "");
  const numericValue = Number(numericText);

  return Number.isNaN(numericValue) || Math.abs(numericValue) > 0.000_001;
}

function isLikelyScheduleLabel(value: unknown) {
  const text = normalizeCellText(value);

  if (!text) {
    return false;
  }

  if (/^\d+(\.\d+)?%$/.test(text) || /^[\d,\s원.-]+$/.test(text)) {
    return false;
  }

  return ![
    "구분",
    "월별",
    "연도별",
    "날짜/누계일",
    "단위공사",
    "전체공사",
    "주간(Resource)"
  ].includes(text);
}

function findScheduleDateHeader(rows: unknown[][]): ScheduleDateHeader | null {
  let best: ScheduleDateHeader | null = null;

  rows.forEach((row, rowIndex) => {
    const dateByColumn = row.map(parseSpreadsheetDate);
    const dateColumns = dateByColumn
      .map((value, index) => (value ? index : -1))
      .filter((index) => index >= 0);

    if (dateColumns.length < 3) {
      return;
    }

    const firstDateColumn = dateColumns[0];
    const lastDateColumn = dateColumns[dateColumns.length - 1];
    const score = dateColumns.length;

    if (!best || score > best.score) {
      best = {
        dateByColumn,
        firstDateColumn,
        lastDateColumn,
        rowIndex,
        score
      };
    }
  });

  return best;
}

function findColumnByLabels(row: unknown[], labels: string[]) {
  return row.findIndex((value) => {
    const text = normalizeCellText(value).toLowerCase();

    return labels.some((label) => text === label || text.includes(label));
  });
}

function cleanImportedActivityLabel(value: string) {
  return value
    .replace(/^\s*(project|wbs):\s*/i, "")
    .replace(/^[A-Za-z0-9_.-]+\s+/, "")
    .trim();
}

function isScheduleSummaryItem(item: ProjectScheduleItem) {
  const title = item.title.replace(/\s+/g, " ").trim();
  const compactTitle = title.replace(/\s+/g, "");

  return (
    item.category === "WBS" ||
    /^WBS:/i.test(title) ||
    /^Project:/i.test(title) ||
    ["전체공사", "직접공사비", "간접공사비", "합계", "누계"].includes(
      compactTitle
    )
  );
}

const scheduleMajorCategoryOrder = [
  "토공사",
  "철골공사",
  "철근콘크리트공사",
  "골조공사",
  "기계공사",
  "전기공사",
  "소방공사"
];

function getScheduleMajorCategory(item: ProjectScheduleItem) {
  const text = `${item.category} ${item.title}`.replace(/\s+/g, "");

  if (/토공|흙막이|가시설|굴착|CIP|PRD/i.test(text)) {
    return "토공사";
  }

  if (/철골/i.test(text)) {
    return "철골공사";
  }

  if (/철근|콘크리트|형틀|타설/i.test(text)) {
    return "철근콘크리트공사";
  }

  if (/골조/i.test(text)) {
    return "골조공사";
  }

  if (/소방|스프링클러|화재|제연/i.test(text)) {
    return "소방공사";
  }

  if (/기계|배관|덕트|공조|위생|가스|슬리브|냉난방/i.test(text)) {
    return "기계공사";
  }

  if (/전기|전력|전등|통신|CABLE|TRAY|DUCT|CCTV|방송|제어|태양광/i.test(text)) {
    return "전기공사";
  }

  return item.category || "기타공사";
}

function getScheduleMajorCategoryOrder(item: ProjectScheduleItem) {
  const orderIndex = scheduleMajorCategoryOrder.indexOf(
    getScheduleMajorCategory(item)
  );

  return orderIndex >= 0 ? orderIndex : scheduleMajorCategoryOrder.length;
}

function compareScheduleItems(left: ProjectScheduleItem, right: ProjectScheduleItem) {
  const leftMajorCategory = getScheduleMajorCategory(left);
  const rightMajorCategory = getScheduleMajorCategory(right);
  const orderDifference =
    getScheduleMajorCategoryOrder(left) - getScheduleMajorCategoryOrder(right);

  if (orderDifference !== 0) {
    return orderDifference;
  }

  return (
    leftMajorCategory.localeCompare(rightMajorCategory, "ko") ||
    left.startDate.localeCompare(right.startDate) ||
    left.endDate.localeCompare(right.endDate) ||
    left.title.localeCompare(right.title, "ko")
  );
}

function extractExplicitScheduleItemsFromRows(
  rows: unknown[][],
  sourceSheet: string
): ImportedScheduleItem[] {
  const header = rows
    .map((row, rowIndex) => {
      const titleColumn = findColumnByLabels(row, [
        "activity name",
        "공정명",
        "작업명",
        "일정명"
      ]);
      const startColumn = findColumnByLabels(row, ["start", "시작"]);
      const endColumn = findColumnByLabels(row, ["finish", "end", "종료", "완료"]);
      const idColumn = findColumnByLabels(row, ["activity id", "id", "코드"]);

      if (titleColumn < 0 || startColumn < 0 || endColumn < 0) {
        return null;
      }

      return { endColumn, idColumn, rowIndex, startColumn, titleColumn };
    })
    .find((value) => value !== null);

  if (!header) {
    return [];
  }

  let currentCategory = "공정";
  const importedItems: ImportedScheduleItem[] = [];

  rows.slice(header.rowIndex + 1).forEach((row, relativeRowIndex) => {
    const sourceRow = header.rowIndex + relativeRowIndex + 2;
    const rawId = header.idColumn >= 0 ? normalizeCellText(row[header.idColumn]) : "";
    const rawTitle = normalizeCellText(row[header.titleColumn]);
    const hierarchyTitle = cleanImportedActivityLabel(rawId);
    const isHierarchyRow = /^(project|wbs):/i.test(rawId);
    const startDate = parseSpreadsheetDate(row[header.startColumn]);
    const endDate = parseSpreadsheetDate(row[header.endColumn]);
    const title = rawTitle || (isHierarchyRow ? hierarchyTitle : "");

    if (isHierarchyRow) {
      if (hierarchyTitle) {
        currentCategory = hierarchyTitle;
      }
      return;
    }

    if (!rawTitle || !title || !startDate || !endDate) {
      return;
    }

    importedItems.push({
      title,
      category: currentCategory,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      notes: `${sourceSheet} ${sourceRow}행에서 가져옴`,
      sourceRow,
      sourceSheet
    });
  });

  return importedItems;
}

function extractScheduleItemsFromRows(
  rows: unknown[][],
  sourceSheet: string
): ImportedScheduleItem[] {
  const header = findScheduleDateHeader(rows);

  if (!header) {
    return [];
  }

  let currentCategory = "공정";
  const importedItems: ImportedScheduleItem[] = [];

  rows.slice(header.rowIndex + 1).forEach((row, relativeRowIndex) => {
    const sourceRow = header.rowIndex + relativeRowIndex + 2;
    const labels = row
      .slice(0, header.firstDateColumn)
      .map((value, index) => ({
        index,
        text: normalizeCellText(value)
      }))
      .filter(({ text }, index) =>
        isLikelyScheduleLabel(row[index]) ? Boolean(text) : false
      );

    if (labels.length >= 2) {
      currentCategory = labels[labels.length - 2].text;
    }

    const title = labels.at(-1)?.text;

    if (!title) {
      return;
    }

    const activeColumns: number[] = [];

    for (
      let column = header.firstDateColumn;
      column <= header.lastDateColumn;
      column += 1
    ) {
      if (header.dateByColumn[column] && isActiveScheduleCell(row[column])) {
        activeColumns.push(column);
      }
    }

    if (activeColumns.length === 0) {
      return;
    }

    const startDate = header.dateByColumn[activeColumns[0]];
    const lastHeaderDate =
      header.dateByColumn[activeColumns.at(-1) ?? activeColumns[0]];

    if (!startDate || !lastHeaderDate) {
      return;
    }

    importedItems.push({
      title,
      category:
        labels.length >= 2 ? labels[labels.length - 2].text : currentCategory,
      startDate,
      endDate: addDaysToInputDate(lastHeaderDate, 6),
      notes: `${sourceSheet} ${sourceRow}행에서 가져옴`,
      sourceRow,
      sourceSheet
    });
  });

  return importedItems;
}

function WorkspaceUploadButton({
  fullWidth = false,
  projectId = null,
  modelVersion = null
}: {
  fullWidth?: boolean;
  projectId?: string | null;
  modelVersion?: string | null;
}) {
  return (
    <IfcUploadButton
      projectId={projectId}
      modelVersion={modelVersion}
      buttonClassName={`${primaryButtonClass} ${
        fullWidth ? "w-full" : ""
      }`}
      messageClassName={`max-w-[320px] truncate text-xs text-[#8f8f8f] ${
        fullWidth ? "text-center" : "text-right"
      }`}
      trigger={
        <span className="inline-flex items-center gap-2">
          <Upload size={16} aria-hidden />
          IFC 업로드</span>
      }
    />
  );
}

export function ProjectWorkspace({
  currentUser,
  initialProjectId,
  projectPage = "info",
  view
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [models, setModels] = useState<IfcModelSummary[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([defaultProject]);
  const [teams, setTeams] = useState<WorkspaceTeam[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId ?? defaultProject.id
  );
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectInvite, setProjectInvite] = useState<ProjectInvitedMember[]>([]);
  const [uploadVersion, setUploadVersion] = useState("v1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    view === "viewer" || view === "project"
  );

  const loadModels = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/ifc/models", {
        cache: "no-store"
      });
      const payload = (await response.json()) as ModelsResponse;

      setModels(payload.models ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedProjects = getStoredProjects(currentUser);
      const visibleProjects = storedProjects.filter((project) =>
        canAccessProject(project, currentUser)
      );
      setProjects(visibleProjects);
      setSelectedProjectId((currentProjectId) =>
        initialProjectId &&
        visibleProjects.some((project) => project.id === initialProjectId)
          ? initialProjectId
          : visibleProjects.some((project) => project.id === currentProjectId)
            ? currentProjectId
          : (visibleProjects[0]?.id ?? "")
      );
      setTeams(getStoredTeams(currentUser));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentUser, initialProjectId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialModels() {
      try {
        const response = await fetch("/api/ifc/models", {
          cache: "no-store"
        });
        const payload = (await response.json()) as ModelsResponse;

        if (isMounted) {
          setModels(payload.models ?? []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleModelsRefresh() {
      void loadModels();
    }

    window.addEventListener("ifc-models:refresh", handleModelsRefresh);

    return () => {
      window.removeEventListener("ifc-models:refresh", handleModelsRefresh);
    };
  }, [loadModels]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateInvitedMemberNames() {
      const storedProjects = getStoredProjects(currentUser);
      const projectsWithLegacyMembers = storedProjects.filter((project) =>
        normalizeInvitedMembers(project.invitedMembers).some(
          (member) => member.name === member.username
        )
      );

      if (projectsWithLegacyMembers.length === 0) {
        return;
      }

      const resolvedProjects = await Promise.all(
        storedProjects.map(async (project) => {
          const invitedMembers = normalizeInvitedMembers(project.invitedMembers);

          if (
            invitedMembers.length === 0 ||
            invitedMembers.every((member) => member.name !== member.username)
          ) {
            return project;
          }

          const resolvedMembers = await Promise.all(
            invitedMembers.map(async (member) => {
              if (member.name !== member.username) {
                return member;
              }

              try {
                const response = await fetch(
                  `/api/auth/users/lookup?username=${encodeURIComponent(
                    member.username
                  )}`,
                  {
                    cache: "no-store"
                  }
                );
                const payload = (await response.json()) as {
                  user?: ProjectInvitedMember;
                };

                return response.ok && payload.user ? payload.user : member;
              } catch {
                return member;
              }
            })
          );

          return {
            ...project,
            invitedMembers: resolvedMembers
          };
        })
      );

      const hasChanges = resolvedProjects.some((project, index) => {
        const previousMembers = normalizeInvitedMembers(
          storedProjects[index]?.invitedMembers
        );
        const nextMembers = normalizeInvitedMembers(project.invitedMembers);

        return nextMembers.some(
          (member, memberIndex) =>
            member.name !== previousMembers[memberIndex]?.name
        );
      });

      if (isMounted && hasChanges) {
        setProjects(
          resolvedProjects.filter((project) =>
            canAccessProject(project, currentUser)
          )
        );
        storeProjects(resolvedProjects);
      }
    }

    void hydrateInvitedMemberNames();

    return () => {
      isMounted = false;
    };
  }, [currentUser, projects]);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    router.push("/");
    router.refresh();
  }

  function createProject() {
    const name = projectName.trim();

    if (!name) {
      return;
    }

    const nextProject: WorkspaceProject = {
      id: crypto.randomUUID(),
      name,
      description: projectDescription.trim(),
      invitedMembers: projectInvite,
      owner: {
        name: currentUser.name,
        username: currentUser.username
      },
      createdAt: new Date().toISOString()
    };
    const nextProjects = [
      ...getStoredProjects(currentUser).filter(
        (project) => project.id !== nextProject.id
      ),
      nextProject
    ];
    const visibleProjects = nextProjects.filter((project) =>
      canAccessProject(project, currentUser)
    );

    setProjects(visibleProjects);
    storeProjects(nextProjects);
    setSelectedProjectId(nextProject.id);
    setProjectName("");
    setProjectDescription("");
    setProjectInvite([]);
  }

  function deleteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);

    if (!project || !window.confirm(`${project.name} 프로젝트를 삭제하시겠습니까?`)) {
      return;
    }

    const nextStoredProjects = getStoredProjects(currentUser).filter(
      (item) => item.id !== projectId
    );
    const nextVisibleProjects = nextStoredProjects.filter((project) =>
      canAccessProject(project, currentUser)
    );

    setProjects(nextVisibleProjects);
    storeProjects(nextStoredProjects);

    if (selectedProjectId === projectId) {
      setSelectedProjectId(nextVisibleProjects[0]?.id ?? "");
    }
  }

  function updateProject(
    projectId: string,
    patch: Partial<
      Pick<
        WorkspaceProject,
        | "name"
        | "description"
        | "coverImage"
        | "coverImageDisplayHeight"
        | "coverImageDisplayWidth"
        | "client"
        | "contractor"
        | "constructionPeriod"
        | "etc"
        | "inspector"
        | "invitedMembers"
        | "location"
        | "locations"
        | "progressRate"
        | "projectNotes"
        | "designer"
        | "subcontractors"
      >
    >
  ) {
    const project = projects.find((item) => item.id === projectId);
    const name = (patch.name ?? project?.name ?? "").trim();

    if (!name) {
      return;
    }

    const nextStoredProjects = getStoredProjects(currentUser).map((project) =>
      project.id === projectId
        ? {
            ...project,
            name,
            description:
              patch.description === undefined
                ? project.description
                : patch.description.trim(),
            coverImage:
              patch.coverImage === undefined
                ? project.coverImage
                : patch.coverImage,
            coverImageDisplayHeight:
              patch.coverImageDisplayHeight === undefined
                ? project.coverImageDisplayHeight
                : patch.coverImageDisplayHeight,
            coverImageDisplayWidth:
              patch.coverImageDisplayWidth === undefined
                ? project.coverImageDisplayWidth
                : patch.coverImageDisplayWidth,
            client:
              patch.client === undefined ? project.client : patch.client.trim(),
            contractor:
              patch.contractor === undefined
                ? project.contractor
                : patch.contractor.trim(),
            constructionPeriod:
              patch.constructionPeriod === undefined
                ? project.constructionPeriod
                : patch.constructionPeriod.trim(),
            etc: patch.etc === undefined ? project.etc : patch.etc.trim(),
            inspector:
              patch.inspector === undefined
                ? project.inspector
                : patch.inspector.trim(),
            invitedMembers:
              patch.invitedMembers === undefined
                ? project.invitedMembers
                : patch.invitedMembers,
            location:
              patch.locations === undefined
                ? project.location
                : normalizeProjectLocations(patch.locations)[0] ?? "",
            locations:
              patch.locations === undefined
                ? project.locations
                : normalizeProjectLocations(patch.locations),
            progressRate:
              patch.progressRate === undefined
                ? project.progressRate
                : patch.progressRate.trim(),
            projectNotes:
              patch.projectNotes === undefined
                ? project.projectNotes
                : patch.projectNotes.trim(),
            designer:
              patch.designer === undefined
                ? project.designer
                : patch.designer.trim(),
            subcontractors:
              patch.subcontractors === undefined
                ? project.subcontractors
                : patch.subcontractors
          }
        : project
    );
    const nextVisibleProjects = nextStoredProjects.filter((project) =>
      canAccessProject(project, currentUser)
    );

    setProjects(nextVisibleProjects);
    storeProjects(nextStoredProjects);
  }

  function createTeam(name: string, members: ProjectInvitedMember[]) {
    const teamName = name.trim();

    if (!teamName) {
      return;
    }

    const nextTeam: WorkspaceTeam = {
      id: crypto.randomUUID(),
      name: teamName,
      members,
      owner: {
        name: currentUser.name,
        username: currentUser.username
      },
      createdAt: new Date().toISOString()
    };
    const nextStoredTeams = [...getAllStoredTeams(), nextTeam];

    storeTeams(nextStoredTeams);
    setTeams(nextStoredTeams.filter((team) => canAccessTeam(team, currentUser)));
  }

  function updateTeam(
    teamId: string,
    patch: Partial<Pick<WorkspaceTeam, "name" | "members">>
  ) {
    const nextStoredTeams = getAllStoredTeams().map((team) => {
      if (
        team.id !== teamId ||
        (currentUser.role !== "admin" &&
          team.owner.username !== currentUser.username)
      ) {
        return team;
      }

      return {
        ...team,
        name: patch.name === undefined ? team.name : patch.name.trim(),
        members: patch.members === undefined ? team.members : patch.members
      };
    });

    storeTeams(nextStoredTeams);
    setTeams(nextStoredTeams.filter((team) => canAccessTeam(team, currentUser)));
  }

  async function deleteIfcModel(modelId: string, fileName: string) {
    if (!window.confirm(`${fileName} IFC 파일을 삭제하시겠습니까?`)) {
      return;
    }

    const response = await fetch(`/api/ifc/models/${modelId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      window.alert(payload?.error ?? "IFC 파일 삭제에 실패했습니다.");
      return;
    }

    setModels((currentModels) =>
      currentModels.filter((model) => model.id !== modelId)
    );
  }

  async function updateIfcModelVersion(modelId: string, modelVersion: string | null) {
    const response = await fetch(`/api/ifc/models/${modelId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        modelVersion
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "IFC 버전 수정에 실패했습니다.");
    }

    const payload = (await response.json()) as {
      model?: IfcModelSummary;
    };

    if (!payload.model) {
      throw new Error("IFC 버전 수정 결과를 불러오지 못했습니다.");
    }

    setModels((currentModels) =>
      currentModels.map((model) =>
        model.id === modelId ? payload.model! : model
      )
    );
  }

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ??
    (view === "project" ? null : (projects[0] ?? null));
  const workspaceName = `${currentUser.name} 워크스페이스`;
  const userInitial = currentUser.name.trim().charAt(0) || "U";

  return (
    <main className="flex min-h-screen bg-[#fafafa] text-[#171717]">
      <aside
        className={`flex shrink-0 flex-col border-r border-[#ebebeb] bg-[#ffffff] transition-[width] duration-200 ${
          isSidebarCollapsed ? "w-[76px]" : "w-[252px]"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-[#ebebeb] ${
            isSidebarCollapsed ? "justify-center px-3" : "gap-3 px-4"
          }`}
        >
          {isSidebarCollapsed ? null : (
            <>
              <div className="flex size-8 items-center justify-center rounded-full border border-[#ebebeb] bg-[#171717] text-sm font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-[-0.02em]">
                  {currentUser.name}
                </p>
                <p className="truncate text-xs text-[#8f8f8f]">
                  {workspaceName}
                </p>
              </div>
            </>
          )}
          <button
            type="button"
            aria-label={isSidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
            title={isSidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden />
            ) : (
              <PanelLeftClose size={18} aria-hidden />
            )}
          </button>
        </div>

        <nav className="flex-1 px-4 py-5">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-11 w-full items-center gap-3 rounded-[9999px] px-3 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-[#171717] text-white"
                      : "text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
                  } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    size={19}
                    className={isActive ? "text-white" : "text-[#8f8f8f]"}
                    aria-hidden
                  />
                  {isSidebarCollapsed ? null : (
                    <span className={isActive ? "text-white" : "text-[#171717]"}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#ebebeb] p-4">
          <button
            type="button"
            title="로그아웃"
            className={`flex h-10 w-full items-center gap-3 rounded-[6px] px-3 text-sm font-medium text-[#4d4d4d] transition hover:bg-[#f6f6f6] hover:text-[#171717] ${
              isSidebarCollapsed ? "justify-center px-0" : ""
            }`}
            onClick={() => void handleLogout()}
          >
            <LogOut size={17} aria-hidden />
            {isSidebarCollapsed ? null : "로그아웃"}
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 bg-[#fafafa] text-[#171717]">
        <header className="border-b border-[#ebebeb] bg-[#fafafa]">
          <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-8 xl:px-12">
            <div>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
                Workspace
              </p>
              <h1 className="text-lg font-semibold tracking-[-0.03em]">
                {workspaceName}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {view === "home" ||
              view === "projects" ||
              view === "team" ? (
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="프로젝트 검색"
                    className="h-10 w-64 rounded-[6px] border border-[#ebebeb] bg-white pl-9 pr-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {view === "home" ? (
          <HomeDashboard
            isLoading={isLoading}
            currentUser={currentUser}
            models={models}
            projects={projects}
            onOpenProjectViewer={(projectId) => {
              router.push(getProjectViewerHref(projectId));
            }}
          />
        ) : null}

        {view === "projects" ? (
          <ProjectManagement
            createProject={createProject}
            currentUser={currentUser}
            models={models}
            projectDescription={projectDescription}
            projectName={projectName}
            projects={projects}
            setProjectDescription={setProjectDescription}
            setProjectInvite={setProjectInvite}
            setProjectName={setProjectName}
            onDeleteModel={deleteIfcModel}
            onDeleteProject={deleteProject}
            onOpenProject={(projectId) => {
              router.push(`/projects/${encodeURIComponent(projectId)}`);
            }}
            onUpdateModelVersion={updateIfcModelVersion}
            onUpdateProject={updateProject}
          />
        ) : null}

        {view === "project" ? (
          <ProjectDetailWorkspace
            currentUser={currentUser}
            models={models}
            project={selectedProject}
            projectPage={projectPage}
            onDeleteModel={deleteIfcModel}
            onUpdateModelVersion={updateIfcModelVersion}
            onUpdateProject={updateProject}
          />
        ) : null}

        {view === "team" ? (
          <TeamWorkspace
            currentUser={currentUser}
            onCreateTeam={createTeam}
            onUpdateTeam={updateTeam}
            teams={teams}
          />
        ) : null}

        {view === "settings" ? <SettingsPlaceholder /> : null}

        {view === "viewer" ? (
          <ViewerWorkspace
            project={selectedProject}
            uploadVersion={uploadVersion}
            setUploadVersion={setUploadVersion}
          />
        ) : null}
      </section>
    </main>
  );
}

function ViewerWorkspace({
  project,
  uploadVersion,
  setUploadVersion
}: {
  project: WorkspaceProject | null;
  uploadVersion: string;
  setUploadVersion: (value: string) => void;
}) {
  const uploadProjectId = getProjectIdForUpload(project?.id);

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-[656px] grid-cols-[340px_minmax(0,1fr)] border-t border-[#ebebeb] max-xl:grid-cols-[300px_minmax(0,1fr)] max-lg:grid-cols-1 max-lg:grid-rows-[auto_minmax(520px,1fr)]">
      <aside className="min-h-0 overflow-hidden border-r border-[#ebebeb] bg-white max-lg:border-b max-lg:border-r-0">
        <ViewerSidebar />
      </aside>

      <section className="flex min-h-0 flex-col bg-[#f2f2f2]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#ebebeb] bg-white px-5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#171717]">
              {project ? project.name : "3D 뷰어"}
            </p>
            <p className="mt-1 text-xs text-[#8f8f8f]">
              IFC 파일 업로드와 기본 버전을 이 화면에서 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-[#667085]">
              업로드 기본 버전
              <input
                type="text"
                value={uploadVersion}
                onChange={(event) => setUploadVersion(event.target.value)}
                placeholder="v1"
                className={`w-28 ${inputClass}`}
              />
            </label>
            <WorkspaceUploadButton
              projectId={uploadProjectId}
              modelVersion={uploadVersion}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <BimViewer />
        </div>
      </section>
    </div>
  );
}

function HomeDashboard({
  isLoading,
  currentUser,
  models,
  projects,
  onOpenProjectViewer
}: {
  isLoading: boolean;
  currentUser: AuthSessionUser;
  models: IfcModelSummary[];
  projects: WorkspaceProject[];
  onOpenProjectViewer: (projectId: string) => void;
}) {
  const recentUploads = [...models]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 6);
  const projectSummaries = projects
    .map((project) => {
      const projectModels = getModelsForProject(models, project.id);
      const sortedModels = [...projectModels].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      const latestModel = sortedModels[0] ?? null;
      const projectReadyCount = projectModels.filter(
        (model) => model.status === "READY"
      ).length;
      const projectProcessingCount = projectModels.filter((model) =>
        ["QUEUED", "PROCESSING", "UPLOADED"].includes(model.status)
      ).length;
      const totalFileSize = projectModels.reduce(
        (sum, model) => sum + model.fileSize,
        0
      );

      return {
        project,
        models: sortedModels,
        latestModel,
        owner: getProjectOwner(project, currentUser),
        invitedMembers: getProjectInvitedMemberSummaries(project),
        readyCount: projectReadyCount,
        processingCount: projectProcessingCount,
        totalFileSize
      };
    })
    .sort((left, right) => {
      if (right.models.length !== left.models.length) {
        return right.models.length - left.models.length;
      }

      return (
        new Date(right.latestModel?.createdAt ?? 0).getTime() -
        new Date(left.latestModel?.createdAt ?? 0).getTime()
      );
    });
  const activeProjectCount = projects.filter(
    (project) => project.id !== defaultProject.id
  ).length;
  const nonEmptyProjectSummaries = projectSummaries.filter(
    (summary) => summary.models.length > 0
  );
  const recentProjects = [...nonEmptyProjectSummaries].slice(0, 4);

  return (
    <div className="mx-auto max-w-[1480px] px-8 py-8 xl:px-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">
            대시보드
          </h2>
        </div>
        <Link
          href="/projects/manage"
          className={secondaryButtonClass}
        >
          프로젝트 관리
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard label="프로젝트" value={`${activeProjectCount}개`} />
        <SummaryCard label="팀 멤버" value={`${teamMembers.length}명`} />
      </div>

      <div className="mt-7">
        <section className={`${surfaceCardClass} p-5`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">프로젝트 현황</h3>
            </div>
            <p className="text-sm text-[#8f8f8f]">{nonEmptyProjectSummaries.length}개</p>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[16px] border border-dashed border-[#ebebeb] px-4 py-8 text-center text-sm text-[#8f8f8f]">
              프로젝트 현황을 불러오는 중입니다.
            </div>
          ) : nonEmptyProjectSummaries.length === 0 ? (
            <div className="mt-5 rounded-[16px] border border-dashed border-[#ebebeb] px-4 py-8 text-center text-sm text-[#8f8f8f]">
              업로드된 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {nonEmptyProjectSummaries.map((summary) => (
                <button
                  key={summary.project.id}
                  type="button"
                  onClick={() => onOpenProjectViewer(summary.project.id)}
                  className="group w-full rounded-[18px] border border-[#ebebeb] bg-white p-5 text-left transition hover:border-[#171717] hover:bg-[#fcfcfc]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                        {summary.project.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#4d4d4d]">
                        {summary.project.description || "설명 없음"}
                      </p>
                    </div>
                    <ExternalLink
                      size={17}
                      className="mt-0.5 shrink-0 text-[#8f8f8f] transition group-hover:text-[#171717]"
                      aria-hidden
                    />
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#8f8f8f]">
                            파일
                          </p>
                          <p className="mt-1 font-semibold">{summary.models.length}개</p>
                        </div>
                        <div>
                          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#8f8f8f]">
                            용량
                          </p>
                          <p className="mt-1 truncate font-semibold">
                            {formatBytes(summary.totalFileSize)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#8f8f8f]">
                          멤버
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#171717] bg-[#171717] px-2.5 py-1 text-[11px] font-medium text-white">
                            소유자: {summary.owner.name}
                          </span>
                          {summary.invitedMembers.map((member) => (
                            <span
                              key={`${summary.project.id}-${member.username}`}
                              className="rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-2.5 py-1 text-[11px] font-medium text-[#4d4d4d]"
                            >
                              {member.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#f2f2f2] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#171717]">
                          업로드 파일
                        </p>
                        <p className="text-xs text-[#8f8f8f]">
                          {summary.latestModel
                            ? `최근 업로드 ${formatUploadedAt(summary.latestModel.createdAt)}`
                            : "업로드 없음"}
                        </p>
                      </div>

                      <div className="grid gap-2 xl:grid-cols-2">
                        {summary.models.slice(0, 4).map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center justify-between gap-3 rounded-[12px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#171717]">
                                {model.originalFileName}
                              </p>
                              <p className="mt-1 text-xs text-[#8f8f8f]">
                                {formatUploadedAt(model.createdAt)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="block rounded-full border border-[#ebebeb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#171717]">
                                {model.modelVersion || "v1"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {summary.models.length > 4 ? (
                        <p className="pt-3 text-xs font-medium text-[#8f8f8f]">
                          + {summary.models.length - 4}개 파일 더 있음
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-7">
        <div className="grid gap-4 xl:grid-cols-2">
          <section className={`${surfaceCardClass} p-5`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">최근 프로젝트</h3>
              </div>
              <p className="text-sm text-[#8f8f8f]">{recentProjects.length}개</p>
            </div>

            {recentProjects.length === 0 ? (
              <div className="mt-5 rounded-[16px] border border-dashed border-[#ebebeb] px-4 py-8 text-center text-sm text-[#8f8f8f]">
                최근 프로젝트가 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentProjects.map((summary) => (
                  <button
                    key={`recent-project-${summary.project.id}`}
                    type="button"
                    onClick={() => onOpenProjectViewer(summary.project.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-left transition hover:border-[#171717] hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#171717]">
                        {summary.project.name}
                      </p>
                      <p className="mt-1 text-xs text-[#8f8f8f]">
                        파일 {summary.models.length}개 · 최근 업로드{" "}
                        {summary.latestModel
                          ? formatUploadedAt(summary.latestModel.createdAt)
                          : "없음"}
                      </p>
                    </div>
                    <ExternalLink size={15} className="shrink-0 text-[#8f8f8f]" aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={`${surfaceCardClass} p-5`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">최근 파일</h3>
              </div>
              <p className="text-sm text-[#8f8f8f]">{recentUploads.length}개</p>
            </div>

            {recentUploads.length === 0 ? (
              <div className="mt-5 rounded-[16px] border border-dashed border-[#ebebeb] px-4 py-8 text-center text-sm text-[#8f8f8f]">
                최근 업로드된 파일이 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentUploads.map((model) => (
                  <div
                    key={model.id}
                    className="rounded-[14px] border border-[#ebebeb] bg-[#fcfcfc] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#171717]">
                          {model.originalFileName}
                        </p>
                        <p className="mt-1 text-xs text-[#8f8f8f]">
                          {formatUploadedAt(model.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#ebebeb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#171717]">
                        {model.modelVersion || "v1"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProjectManagement({
  createProject,
  currentUser,
  models,
  projectDescription,
  projectName,
  projects,
  setProjectDescription,
  setProjectInvite,
  setProjectName,
  onDeleteModel,
  onDeleteProject,
  onOpenProject,
  onUpdateModelVersion,
  onUpdateProject
}: {
  createProject: () => void;
  currentUser: AuthSessionUser;
  models: IfcModelSummary[];
  projectDescription: string;
  projectName: string;
  projects: WorkspaceProject[];
  setProjectDescription: (value: string) => void;
  setProjectInvite: (value: ProjectInvitedMember[]) => void;
  setProjectName: (value: string) => void;
  onDeleteModel: (modelId: string, fileName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onUpdateModelVersion: (
    modelId: string,
    modelVersion: string | null
  ) => Promise<void>;
  onUpdateProject: (
    projectId: string,
    patch: Partial<
      Pick<
        WorkspaceProject,
        | "name"
        | "description"
        | "coverImage"
        | "coverImageDisplayHeight"
        | "coverImageDisplayWidth"
        | "client"
        | "contractor"
        | "constructionPeriod"
        | "etc"
        | "inspector"
        | "invitedMembers"
        | "location"
        | "locations"
        | "progressRate"
        | "projectNotes"
        | "designer"
        | "subcontractors"
      >
    >
  ) => void;
}) {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<WorkspaceProject | null>(null);
  const settingsProject =
    projects.find((project) => project.id === settingsProjectId) ?? null;
  const settingsProjectModels = settingsProject
    ? models.filter((model) => isModelInProject(model, settingsProject.id))
    : [];
  const activeProjectDraft =
    editProject && editProject.id === settingsProject?.id
      ? editProject
      : settingsProject;
  const hasProjectChanges = hasEditableProjectChanges(
    settingsProject,
    activeProjectDraft
  );

  function saveProjectProperties() {
    if (!settingsProject || !activeProjectDraft?.name.trim()) {
      return;
    }

    onUpdateProject(settingsProject.id, {
      name: activeProjectDraft.name,
      coverImage: activeProjectDraft.coverImage,
      client: activeProjectDraft.client,
      contractor: activeProjectDraft.contractor,
      constructionPeriod: activeProjectDraft.constructionPeriod,
      etc: activeProjectDraft.etc,
      inspector: activeProjectDraft.inspector,
      locations: getProjectLocations(activeProjectDraft),
      projectNotes: activeProjectDraft.projectNotes,
      designer: activeProjectDraft.designer
    });
    setEditProject(null);
  }

  function resetProjectProperties() {
    setEditProject(null);
  }

  function updateProjectDraft(
    patch: Partial<WorkspaceProjectEditableFields>
  ) {
    if (!settingsProject) {
      return;
    }

    setEditProject({
      ...(activeProjectDraft ?? settingsProject),
      ...patch
    });
  }

  function openProjectSettings(project: WorkspaceProject) {
    setSettingsProjectId(project.id);
    setEditProject(null);
  }

  function closeProjectSettings() {
    setSettingsProjectId(null);
    setEditProject(null);
  }

  function openCreateProjectDialog() {
    setProjectName("");
    setProjectDescription("");
    setProjectInvite([]);
    setIsCreateProjectOpen(true);
  }

  function submitCreateProject() {
    if (!projectName.trim()) {
      return;
    }

    createProject();
    setIsCreateProjectOpen(false);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">프로젝트</h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            프로젝트를 만들고 IFC 파일을 묶어서 관리합니다.
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={openCreateProjectDialog}
        >
          <Plus size={16} aria-hidden />
          새 프로젝트 만들기
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <button
          type="button"
          className="flex min-h-[232px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[#d9d9d9] bg-white p-5 text-center transition hover:border-[#171717] hover:bg-[#fcfcfc]"
          onClick={openCreateProjectDialog}
        >
          <Plus size={34} className="text-[#4d4d4d]" aria-hidden />
          <span className="mt-5 text-sm font-semibold text-[#171717]">
            프로젝트 시작하기
          </span>
        </button>

        {projects.map((project) => {
          const projectModels = getModelsForProject(models, project.id);

          return (
            <div
              key={project.id}
              className="group overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white transition hover:border-[#171717]"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => onOpenProject(project.id)}
              >
                <div className="relative flex aspect-[16/9] items-center justify-center bg-[#f0f0f0]">
                  {project.coverImage ? (
                    // User-uploaded data URLs are previewed directly instead of using Next image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.coverImage}
                      alt=""
                      className="size-full object-fill"
                    />
                  ) : (
                    <div className="text-center text-[#8f8f8f]">
                      <FolderKanban size={32} className="mx-auto" aria-hidden />
                      <p className="mt-2 text-xs">대표 이미지 없음</p>
                    </div>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-[#4d4d4d]">
                    IFC {projectModels.length}개
                  </span>
                </div>
                <div className="p-4">
                  <p className="truncate text-base font-semibold text-[#171717]">
                    {project.name}
                  </p>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-[#8f8f8f]">
                    {project.description || "설명 없음"}
                  </p>
                </div>
              </button>
              <div className="flex items-center justify-between border-t border-[#f2f2f2] px-3 py-2">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  aria-label={`${project.name} 설정`}
                  title="프로젝트 설정"
                  onClick={() => openProjectSettings(project)}
                >
                  <Settings size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  aria-label={`${project.name} 삭제`}
                  title="프로젝트 삭제"
                  onClick={() => onDeleteProject(project.id)}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {settingsProject && activeProjectDraft ? (
        <ProjectSettingsDialog
          activeProjectDraft={activeProjectDraft}
          currentUser={currentUser}
          hasProjectChanges={hasProjectChanges}
          models={settingsProjectModels}
          onClose={closeProjectSettings}
          onDeleteModel={onDeleteModel}
          onUpdateModelVersion={onUpdateModelVersion}
          onReset={resetProjectProperties}
          onSave={saveProjectProperties}
          onUpdateInvitedMembers={(invitedMembers) =>
            onUpdateProject(activeProjectDraft.id, {
              invitedMembers
            })
          }
          onUpdateSubcontractors={(subcontractors) =>
            onUpdateProject(activeProjectDraft.id, {
              subcontractors
            })
          }
          onUpdateDraft={updateProjectDraft}
        />
      ) : null}
      {isCreateProjectOpen ? (
        <CreateProjectDialog
          projectDescription={projectDescription}
          projectName={projectName}
          setProjectDescription={setProjectDescription}
          setProjectInvite={setProjectInvite}
          setProjectName={setProjectName}
          onClose={() => setIsCreateProjectOpen(false)}
          onCreate={submitCreateProject}
        />
      ) : null}
    </div>
  );
}

function ProjectDetailWorkspace({
  currentUser,
  models,
  project,
  projectPage,
  onDeleteModel,
  onUpdateModelVersion,
  onUpdateProject
}: {
  currentUser: AuthSessionUser;
  models: IfcModelSummary[];
  project: WorkspaceProject | null;
  projectPage: ProjectPageKey;
  onDeleteModel: (modelId: string, fileName: string) => void;
  onUpdateModelVersion: (
    modelId: string,
    modelVersion: string | null
  ) => Promise<void>;
  onUpdateProject: (
    projectId: string,
    patch: Partial<
      Pick<
        WorkspaceProject,
        | "name"
        | "description"
        | "coverImage"
        | "coverImageDisplayHeight"
        | "coverImageDisplayWidth"
        | "client"
        | "contractor"
        | "constructionPeriod"
        | "etc"
        | "inspector"
        | "invitedMembers"
        | "location"
        | "locations"
        | "progressRate"
        | "projectNotes"
        | "designer"
        | "subcontractors"
      >
    >
  ) => void;
}) {
  const [editProject, setEditProject] = useState<WorkspaceProject | null>(null);
  const [viewerUploadVersion, setViewerUploadVersion] = useState("v1");
  const displayedModels = project
    ? models.filter((model) => isModelInProject(model, project.id))
    : [];
  const activeProjectDraft =
    editProject && editProject.id === project?.id ? editProject : project;
  const hasProjectChanges = hasEditableProjectChanges(
    project,
    activeProjectDraft
  );

  function saveProjectProperties() {
    if (!project || !activeProjectDraft?.name.trim()) {
      return;
    }

    onUpdateProject(project.id, {
      name: activeProjectDraft.name,
      coverImage: activeProjectDraft.coverImage,
      client: activeProjectDraft.client,
      contractor: activeProjectDraft.contractor,
      constructionPeriod: activeProjectDraft.constructionPeriod,
      etc: activeProjectDraft.etc,
      inspector: activeProjectDraft.inspector,
      locations: getProjectLocations(activeProjectDraft),
      projectNotes: activeProjectDraft.projectNotes,
      designer: activeProjectDraft.designer
    });
    setEditProject(null);
  }

  function updateProjectDraft(
    patch: Partial<WorkspaceProjectEditableFields>
  ) {
    if (!project) {
      return;
    }

    setEditProject({
      ...(activeProjectDraft ?? project),
      ...patch
    });
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-[1480px] px-8 py-8 xl:px-12">
        <div className="rounded-2xl border border-dashed border-[#ebebeb] bg-white p-10 text-center">
          <p className="text-base font-semibold">프로젝트를 찾을 수 없습니다.</p>
          <p className="mt-2 text-sm text-[#4d4d4d]">
            접근 가능한 프로젝트 목록에서 다시 선택해 주세요.
          </p>
          <div className="mt-5 flex justify-center">
            <Link href="/projects/manage" className={secondaryButtonClass}>
              <ArrowLeft size={15} aria-hidden />
              프로젝트 목록
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invitedMembers = getProjectInvitedMemberSummaries(project);
  const projectBaseHref = `/projects/${encodeURIComponent(project.id)}`;
  const projectMenuItems = [
    {
      key: "info",
      label: "프로젝트 정보",
      href: `${projectBaseHref}/info`,
      icon: Info
    },
    {
      key: "viewer",
      label: "3D 뷰어",
      href: `${projectBaseHref}/viewer`,
      icon: Box
    },
    {
      key: "documents",
      label: "문서관리",
      href: `${projectBaseHref}/documents`,
      icon: FileText
    },
    {
      key: "schedule",
      label: "공정관리",
      href: `${projectBaseHref}/schedule`,
      icon: ChartNoAxesGantt
    },
    {
      key: "progress-payments",
      label: "기성관리",
      href: `${projectBaseHref}/progress-payments`,
      icon: ClipboardList
    },
    {
      key: "subcontractors",
      label: "협력사",
      href: `${projectBaseHref}/subcontractors`,
      icon: Building2
    },
    {
      key: "photos",
      label: "사진첩",
      href: `${projectBaseHref}/photos`,
      icon: ImageIcon
    },
    {
      key: "members",
      label: "팀원",
      href: `${projectBaseHref}/members`,
      icon: Users
    }
  ];

  return (
    <div className="grid h-[calc(100vh-4rem)] min-h-[656px] grid-cols-[224px_minmax(0,1fr)] border-t border-[#ebebeb] max-lg:h-auto max-lg:grid-cols-1">
      <aside className="flex min-h-0 flex-col border-r border-[#ebebeb] bg-white px-4 py-6 max-lg:border-b max-lg:border-r-0">
        <div className="mb-5 px-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#8f8f8f]">
            Project
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#171717]">
            {project.name}
          </p>
        </div>
        <nav className="space-y-1" aria-label="프로젝트 메뉴">
          {projectMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === projectPage;

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#171717] text-white"
                    : "text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
                }`}
              >
                <Icon
                  size={17}
                  className={isActive ? "text-white" : "text-[#8f8f8f]"}
                  aria-hidden
                />
                <span className={isActive ? "text-white" : "text-[#171717]"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#ebebeb] pt-4">
          <Link
            href={`${projectBaseHref}/settings`}
            aria-current={projectPage === "settings" ? "page" : undefined}
            className={`flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition ${
              projectPage === "settings"
                ? "bg-[#171717] text-white"
                : "text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
            }`}
          >
            <Settings
              size={17}
              className={projectPage === "settings" ? "text-white" : "text-[#8f8f8f]"}
              aria-hidden
            />
            <span className={projectPage === "settings" ? "text-white" : "text-[#171717]"}>
              프로젝트 설정
            </span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0 overflow-y-auto scroll-smooth">
        <div
          className={
            projectPage === "viewer"
              ? "h-full"
              : "mx-auto max-w-[1480px] px-8 py-8 xl:px-12"
          }
        >
          {projectPage === "info" ? (
            <ProjectInfoPage
              displayedModels={displayedModels}
              invitedMembers={invitedMembers}
              project={project}
              onUpdateProject={onUpdateProject}
            />
          ) : null}

          {projectPage === "viewer" ? (
            <ViewerWorkspace
              project={project}
              uploadVersion={viewerUploadVersion}
              setUploadVersion={setViewerUploadVersion}
            />
          ) : null}

          {projectPage === "documents" ? (
            <ProjectDocumentsPage project={project} />
          ) : null}

          {projectPage === "settings" && activeProjectDraft ? (
            <ProjectSettingsDialog
              activeProjectDraft={activeProjectDraft}
              currentUser={currentUser}
              hasProjectChanges={hasProjectChanges}
              models={displayedModels}
              variant="page"
              onClose={() => undefined}
              onDeleteModel={onDeleteModel}
              onUpdateModelVersion={onUpdateModelVersion}
              onReset={() => setEditProject(null)}
              onSave={saveProjectProperties}
              onUpdateInvitedMembers={(nextInvitedMembers) =>
                onUpdateProject(activeProjectDraft.id, {
                  invitedMembers: nextInvitedMembers
                })
              }
              onUpdateSubcontractors={(subcontractors) =>
                onUpdateProject(activeProjectDraft.id, {
                  subcontractors
                })
              }
              onUpdateDraft={updateProjectDraft}
            />
          ) : null}

          {projectPage === "schedule" ? (
            <ProjectScheduleSection project={project} />
          ) : null}

          {projectPage === "subcontractors" ? (
            <ProjectSubcontractorsPage key={project.id} project={project} />
          ) : null}

          {projectPage === "progress-payments" ||
          projectPage === "photos" ||
          projectPage === "members" ? (
            <ProjectComingSoonPage page={projectPage} project={project} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProjectInfoPage({
  displayedModels,
  invitedMembers,
  onUpdateProject,
  project
}: {
  displayedModels: IfcModelSummary[];
  invitedMembers: ProjectInvitedMember[];
  onUpdateProject: (
    projectId: string,
    patch: Partial<WorkspaceProjectEditableFields>
  ) => void;
  project: WorkspaceProject;
}) {
  const [activeInfoTab, setActiveInfoTab] =
    useState<ProjectInfoTabKey>("sitePhotos");
  const projectInfoTabs: Array<{
    key: ProjectInfoTabKey;
    label: string;
  }> = [
    { key: "sitePhotos", label: "현장사진" },
    { key: "dashboard", label: "대시보드" }
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{project.name}</h2>
        </div>
      </div>

      <section className="mb-8">
        <div className="border-b border-[#ebebeb]">
          <div className="flex flex-wrap gap-1">
            {projectInfoTabs.map((tab) => {
              const isActive = activeInfoTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`rounded-t-[8px] border border-b-0 px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-[#171717] bg-white text-[#171717]"
                      : "border-[#ebebeb] bg-[#fcfcfc] text-[#4d4d4d] hover:bg-white hover:text-[#171717]"
                  }`}
                  onClick={() => setActiveInfoTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-b-[8px] border border-t-0 border-[#ebebeb] bg-white p-5">
          {activeInfoTab === "sitePhotos" ? (
            <ProjectSitePhotosTab
              project={project}
              onUpdateProject={onUpdateProject}
            />
          ) : null}

          {activeInfoTab === "dashboard" ? (
            <ProjectDashboardTab
              displayedModels={displayedModels}
              invitedMembers={invitedMembers}
              project={project}
            />
          ) : null}

        </div>
      </section>
    </>
  );
}

function ProjectSitePhotosTab({
  project,
  onUpdateProject
}: {
  project: WorkspaceProject;
  onUpdateProject: (
    projectId: string,
    patch: Partial<WorkspaceProjectEditableFields>
  ) => void;
}) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [photoUploadDraft, setPhotoUploadDraft] =
    useState<SitePhotoUploadDraft | null>(null);
  const photoUploadDraftRef = useRef<SitePhotoUploadDraft | null>(null);

  useEffect(() => {
    photoUploadDraftRef.current = photoUploadDraft;
  }, [photoUploadDraft]);

  useEffect(() => {
    return () => {
      if (photoUploadDraftRef.current) {
        URL.revokeObjectURL(photoUploadDraftRef.current.previewUrl);
      }
    };
  }, []);

  async function openPhotoUploadEditor(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isUploadingPhoto) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const previousDraft = photoUploadDraft;
    const previewUrl = URL.createObjectURL(file);
    setPhotoUploadError("");

    try {
      const { height, width } = await getImageDimensions(previewUrl);
      const maxEdge = 1600;
      const scale = Math.min(1, maxEdge / Math.max(width, height));

      if (previousDraft) {
        URL.revokeObjectURL(previousDraft.previewUrl);
      }

      setPhotoUploadDraft({
        file,
        fileName: file.name,
        keepAspectRatio: true,
        naturalHeight: height,
        naturalWidth: width,
        previewUrl,
        targetHeight: Math.max(1, Math.round(height * scale)),
        targetWidth: Math.max(1, Math.round(width * scale))
      });
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setPhotoUploadError(
        error instanceof Error ? error.message : "사진 파일을 읽지 못했습니다."
      );
    }
  }

  function closePhotoUploadEditor() {
    if (photoUploadDraft) {
      URL.revokeObjectURL(photoUploadDraft.previewUrl);
    }

    setPhotoUploadDraft(null);
  }

  function updatePhotoTargetWidth(value: string) {
    if (!photoUploadDraft) {
      return;
    }

    const targetWidth = clampSitePhotoSize(value);
    const targetHeight = photoUploadDraft.keepAspectRatio
      ? Math.max(
          1,
          Math.round(
            targetWidth *
              (photoUploadDraft.naturalHeight / photoUploadDraft.naturalWidth)
          )
        )
      : photoUploadDraft.targetHeight;

    setPhotoUploadDraft({
      ...photoUploadDraft,
      targetHeight,
      targetWidth
    });
  }

  function updatePhotoTargetHeight(value: string) {
    if (!photoUploadDraft) {
      return;
    }

    const targetHeight = clampSitePhotoSize(value);
    const targetWidth = photoUploadDraft.keepAspectRatio
      ? Math.max(
          1,
          Math.round(
            targetHeight *
              (photoUploadDraft.naturalWidth / photoUploadDraft.naturalHeight)
          )
        )
      : photoUploadDraft.targetWidth;

    setPhotoUploadDraft({
      ...photoUploadDraft,
      targetHeight,
      targetWidth
    });
  }

  function togglePhotoAspectRatio(keepAspectRatio: boolean) {
    if (!photoUploadDraft) {
      return;
    }

    setPhotoUploadDraft({
      ...photoUploadDraft,
      keepAspectRatio
    });
  }

  async function uploadAdjustedSitePhoto() {
    if (!photoUploadDraft || isUploadingPhoto) {
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadError("");

    try {
      const resizedFile = await createResizedSitePhotoFile(
        photoUploadDraft.file,
        photoUploadDraft.targetWidth,
        photoUploadDraft.targetHeight
      );
      const formData = new FormData();
      formData.append("projectId", project.id);
      formData.append("file", resizedFile);

      const response = await fetch("/api/projects/photos/upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        error?: string;
        photo?: {
          url: string;
        };
      };

      if (!response.ok || !payload.photo?.url) {
        throw new Error(payload.error || "사진 업로드에 실패했습니다.");
      }

      onUpdateProject(project.id, {
        coverImage: payload.photo.url,
        coverImageDisplayHeight: photoUploadDraft.targetHeight,
        coverImageDisplayWidth: photoUploadDraft.targetWidth
      });
      closePhotoUploadEditor();
    } catch (error) {
      setPhotoUploadError(
        error instanceof Error ? error.message : "사진 업로드에 실패했습니다."
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div>
        <div className="flex min-h-[360px] items-center justify-center rounded-[8px] border border-dashed border-[#ebebeb] bg-[#fcfcfc]">
          {project.coverImage ? (
            <div className="flex min-h-[360px] w-full items-center justify-center overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white p-4">
              {/* Project photos may come from app API URLs or existing data URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.coverImage}
                alt=""
                className="max-h-[328px] max-w-full object-contain"
                style={{
                  height: project.coverImageDisplayHeight
                    ? `${project.coverImageDisplayHeight}px`
                    : "auto",
                  width: project.coverImageDisplayWidth
                    ? `${project.coverImageDisplayWidth}px`
                    : "100%"
                }}
              />
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon
                size={34}
                className="mx-auto text-[#c0c0c0]"
                aria-hidden
              />
              <p className="mt-3 text-sm font-medium text-[#8f8f8f]">
                등록된 현장사진이 없습니다.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {photoUploadError ? (
            <p className="mr-auto text-sm font-medium text-[#c2410c]">
              {photoUploadError}
            </p>
          ) : null}
          <label
            className={`${secondaryButtonClass} cursor-pointer ${
              isUploadingPhoto ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload size={15} aria-hidden />
            {isUploadingPhoto ? "업로드 중" : "사진 업로드"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isUploadingPhoto}
              onChange={(event) => void openPhotoUploadEditor(event)}
            />
          </label>
        </div>
      </div>

      <ProjectInfoTable project={project} compact />

      {photoUploadDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-photo-upload-title"
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[12px] border border-[#dedede] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
              <div>
                <h3
                  id="site-photo-upload-title"
                  className="text-base font-semibold text-[#171717]"
                >
                  사진 크기 조절
                </h3>
                <p className="mt-1 text-xs text-[#6f6f6f]">
                  조절한 크기로 저장한 뒤 Google Drive에 업로드합니다.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                aria-label="사진 크기 조절 닫기"
                onClick={closePhotoUploadEditor}
                disabled={isUploadingPhoto}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="grid min-h-0 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-[360px] items-center justify-center rounded-[8px] border border-[#ebebeb] bg-[#f8f8f8] p-4">
                <div
                  className="max-h-[520px] max-w-full overflow-hidden rounded-[8px] border border-[#d9d9d9] bg-white shadow-sm"
                  style={{
                    aspectRatio: `${photoUploadDraft.targetWidth} / ${photoUploadDraft.targetHeight}`,
                    width: "min(100%, 640px)"
                  }}
                >
                  {/* Local object URL preview before uploading to Drive. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUploadDraft.previewUrl}
                    alt={photoUploadDraft.fileName}
                    className="size-full object-fill"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    {photoUploadDraft.fileName}
                  </p>
                  <p className="mt-1 text-xs text-[#6f6f6f]">
                    원본 {photoUploadDraft.naturalWidth} x{" "}
                    {photoUploadDraft.naturalHeight}px
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-[#171717]">
                  <input
                    type="checkbox"
                    checked={photoUploadDraft.keepAspectRatio}
                    onChange={(event) =>
                      togglePhotoAspectRatio(event.target.checked)
                    }
                  />
                  비율 유지
                </label>

                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-[#171717]">
                    가로(px)
                    <input
                      type="number"
                      min={64}
                      max={2400}
                      className={inputClass}
                      value={photoUploadDraft.targetWidth}
                      onChange={(event) =>
                        updatePhotoTargetWidth(event.target.value)
                      }
                    />
                  </label>
                  <input
                    type="range"
                    min={64}
                    max={2400}
                    value={photoUploadDraft.targetWidth}
                    onChange={(event) =>
                      updatePhotoTargetWidth(event.target.value)
                    }
                  />
                </div>

                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-[#171717]">
                    세로(px)
                    <input
                      type="number"
                      min={64}
                      max={2400}
                      className={inputClass}
                      value={photoUploadDraft.targetHeight}
                      onChange={(event) =>
                        updatePhotoTargetHeight(event.target.value)
                      }
                    />
                  </label>
                  <input
                    type="range"
                    min={64}
                    max={2400}
                    value={photoUploadDraft.targetHeight}
                    onChange={(event) =>
                      updatePhotoTargetHeight(event.target.value)
                    }
                  />
                </div>

                <div className="rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-xs text-[#6f6f6f]">
                  업로드 크기 {photoUploadDraft.targetWidth} x{" "}
                  {photoUploadDraft.targetHeight}px
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#ebebeb] px-5 py-4">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={closePhotoUploadEditor}
                disabled={isUploadingPhoto}
              >
                취소
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void uploadAdjustedSitePhoto()}
                disabled={isUploadingPhoto}
              >
                <Upload size={15} aria-hidden />
                {isUploadingPhoto ? "업로드 중" : "업로드"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectDashboardTab({
  project
}: {
  displayedModels: IfcModelSummary[];
  invitedMembers: ProjectInvitedMember[];
  project: WorkspaceProject;
}) {
  const [reports, setReports] = useState<ConstructionDailyReport[]>([]);
  const [schedules, setSchedules] = useState<ProjectScheduleItem[]>([]);
  const today = getTodayInputValue();
  const latestReport = reports[0] ?? null;
  const constructionPeriodSummary = getProjectConstructionPeriodSummary(
    project.constructionPeriod,
    today
  );
  const scheduleProgress = getProjectScheduleProgress(schedules, today);
  const scheduleProgressStatus =
    schedules.filter((item) => !isScheduleSummaryItem(item)).length === 0
      ? "등록 공정 없음"
      : scheduleProgress >= 100
      ? "완료"
      : scheduleProgress > 0
      ? "진행중"
      : "대기";
  const totalEmployeeCount = latestReport
    ? getReportContractorCumulativeLaborCount(latestReport)
    : 0;
  const totalWorkerCount = latestReport
    ? getReportSubcontractorCumulativeLaborCount(latestReport)
    : 0;
  const tradeLaborRows = latestReport
    ? getSubcontractorTradeLaborRows(latestReport)
    : [];
  const subcontractorLaborRows = latestReport
    ? getSubcontractorCompanyLaborRows(latestReport)
    : [];
  const maxTradeLaborCount = Math.max(
    1,
    ...tradeLaborRows.map((row) => row.count)
  );
  const maxSubcontractorLaborCount = Math.max(
    1,
    ...subcontractorLaborRows.map((row) => row.count)
  );
  const materialRows = latestReport
    ? getActiveQuantityRows(latestReport.materialRows)
    : [];
  const equipmentRows = latestReport
    ? getActiveQuantityRows(latestReport.equipmentRows)
    : [];
  const noteItems = latestReport ? getDashboardNoteItems(latestReport) : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReports(getProjectDailyReports(project.id));
      setSchedules(getProjectSchedules(project.id));
    });

    return () => {
      window.clearTimeout(timer);
    };
  }, [project.id]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardPanel title="공사기간" className="min-h-[132px]">
          {constructionPeriodSummary ? (
            <div className="mt-3">
              <p className="text-xs text-[#6f6f6f]">
                {constructionPeriodSummary.startDate} ~{" "}
                {constructionPeriodSummary.endDate}
              </p>
              <p className="mt-3 text-base font-semibold text-[#171717]">
                착공 {constructionPeriodSummary.elapsedDays}일 경과
              </p>
              <p className="mt-2 text-xs text-[#4d4d4d]">
                준공까지 {constructionPeriodSummary.remainingDays}일 남음
              </p>
            </div>
          ) : (
            <EmptyDashboardState compact />
          )}
        </DashboardPanel>

        <DashboardPanel title="공정률" className="min-h-[132px]" hasMenu>
          <div className="mt-3">
            <p className="text-xs text-[#6f6f6f]">{scheduleProgressStatus}</p>
            <p className="mt-2 text-base font-semibold text-[#171717]">
              {scheduleProgress}%
            </p>
            <div className="mx-auto mt-3 h-6 w-[72%] overflow-hidden bg-[#b8b8b8]">
              <div
                className="h-full bg-[#171717]"
                style={{ width: `${scheduleProgress}%` }}
              />
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="누적 직원수" className="min-h-[132px]">
          <div className="mt-3">
            <p className="text-xs text-[#6f6f6f]">공사일보 시공사 누계</p>
            <p className="mt-2 text-base font-semibold text-[#171717]">
              {totalEmployeeCount}명
            </p>
          </div>
        </DashboardPanel>

        <DashboardPanel title="누적 작업자수" className="min-h-[132px]">
          <div className="mt-3">
            <p className="text-xs text-[#6f6f6f]">공사일보 협력사 누계</p>
            <p className="mt-2 text-base font-semibold text-[#171717]">
              {totalWorkerCount}명
            </p>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="주요사항" className="min-h-[238px]" hasMenu>
        {noteItems.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-[#4d4d4d]">
            {noteItems.map((item) => (
              <li key={item} className="rounded-[6px] bg-[#fcfcfc] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyDashboardState />
        )}
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,336px)_minmax(260px,336px)_minmax(0,1fr)]">
        <DashboardPanel title="협력사별 작업자 수" className="min-h-[360px]" hasMenu>
          {subcontractorLaborRows.length > 0 ? (
            <div className="mt-4 space-y-3">
              {subcontractorLaborRows.map((row) => (
                <DashboardMeter
                  key={row.name}
                  label={row.name}
                  value={`${row.count}명`}
                  percent={Math.round(
                    (row.count / maxSubcontractorLaborCount) * 100
                  )}
                />
              ))}
            </div>
          ) : (
            <EmptyDashboardState />
          )}
        </DashboardPanel>

        <DashboardPanel title="공종별 작업자 수" className="min-h-[360px]" hasMenu>
          {tradeLaborRows.length > 0 ? (
            <div className="mt-4 space-y-3">
              {tradeLaborRows.map((row) => (
                <DashboardMeter
                  key={row.trade}
                  label={row.trade}
                  value={`${row.count}명`}
                  percent={Math.round((row.count / maxTradeLaborCount) * 100)}
                />
              ))}
            </div>
          ) : (
            <EmptyDashboardState />
          )}
        </DashboardPanel>

        <div className="grid gap-4">
          <DashboardPanel title="주요자재 입고현황" className="min-h-[168px]" hasMenu>
            {materialRows.length > 0 ? (
              <DashboardQuantityList rows={materialRows} />
            ) : (
              <EmptyDashboardState />
            )}
          </DashboardPanel>

          <DashboardPanel title="장비 현황" className="min-h-[168px]" hasMenu>
            {equipmentRows.length > 0 ? (
              <DashboardQuantityList rows={equipmentRows} />
            ) : (
              <EmptyDashboardState />
            )}
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({
  children,
  className = "",
  hasMenu = false,
  title
}: {
  children: ReactNode;
  className?: string;
  hasMenu?: boolean;
  title: string;
}) {
  return (
    <section
      className={`rounded-[6px] border border-[#d9d9d9] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.16)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
        {hasMenu ? (
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-[4px] text-[#2bb673] transition hover:bg-[#f2fbf6]"
            aria-label={`${title} 더보기`}
          >
            <MoreHorizontal size={15} aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyDashboardState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "min-h-[78px]" : "min-h-[140px]"
      }`}
    >
      <PackageOpen size={34} className="text-[#dddddd]" strokeWidth={1.4} aria-hidden />
      <p className="mt-2 text-xs font-medium text-[#9aa0a6]">데이터 없음</p>
    </div>
  );
}

function DashboardMeter({
  label,
  percent,
  value
}: {
  label: string;
  percent: number;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[#4d4d4d]">{label}</span>
        <span className="font-semibold text-[#171717]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeeee]">
        <div
          className="h-full rounded-full bg-[#4d4d4d]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function DashboardQuantityList({ rows }: { rows: DailyReportQuantityRow[] }) {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-2">
      {rows.map((row) => (
        <div
          key={`${row.trade}-${row.name}-${row.spec}`}
          className="rounded-[6px] border border-[#eeeeee] bg-[#fcfcfc] px-3 py-2"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-[#171717]">
              {row.name}
            </p>
            <p className="shrink-0 text-xs font-medium text-[#4d4d4d]">
              {formatDailyReportNumber(getDailyReportCumulativeNumber(row))}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-[#8f8f8f]">
            {row.trade}
            {row.spec ? ` · ${row.spec}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function parseDashboardNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function getDailyReportCumulativeNumber(
  row: DailyReportLaborRow | DailyReportQuantityRow
) {
  if (row.total.trim()) {
    return parseDashboardNumber(row.total);
  }

  return parseDashboardNumber(row.previous) + parseDashboardNumber(row.today);
}

function getLaborRowCount(row: DailyReportLaborRow) {
  return getDailyReportCumulativeNumber(row);
}

function getLaborRowsCumulativeCount(rows: DailyReportLaborRow[]) {
  return rows.reduce((sum, row) => sum + getLaborRowCount(row), 0);
}

function getReportContractorCumulativeLaborCount(
  report: ConstructionDailyReport
) {
  return getLaborRowsCumulativeCount(report.contractorLaborRows);
}

function getReportSubcontractorCumulativeLaborCount(
  report: ConstructionDailyReport
) {
  return getLaborRowsCumulativeCount(report.subcontractorLaborRows);
}

function getSubcontractorTradeLaborRows(report: ConstructionDailyReport) {
  const tradeCounts = new Map<string, number>();

  for (const row of report.subcontractorLaborRows) {
    const trade = row.trade.trim();

    if (!trade) {
      continue;
    }

    const count = getLaborRowCount(row);

    if (count <= 0) {
      continue;
    }

    tradeCounts.set(trade, (tradeCounts.get(trade) ?? 0) + count);
  }

  return [...tradeCounts.entries()]
    .map(([trade, count]) => ({ trade, count }))
    .sort((left, right) => right.count - left.count || left.trade.localeCompare(right.trade));
}

function getSubcontractorCompanyLaborRows(report: ConstructionDailyReport) {
  const companyCounts = new Map<string, number>();

  for (const row of report.subcontractorLaborRows) {
    const name = row.subcontractorName?.trim() || "협력사 미선택";
    const count = getLaborRowCount(row);

    if (count <= 0) {
      continue;
    }

    companyCounts.set(name, (companyCounts.get(name) ?? 0) + count);
  }

  return [...companyCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function getActiveQuantityRows(rows: DailyReportQuantityRow[]) {
  return rows.filter(
    (row) =>
      Boolean(row.trade.trim()) &&
      Boolean(row.name.trim())
  );
}

function getDashboardNoteItems(report: ConstructionDailyReport) {
  const items = [
    report.notes,
    ...report.workItems.flatMap((item) => [item.today, item.tomorrow])
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(items)).slice(0, 6);
}

function clampSitePhotoSize(value: string) {
  const parsed = Math.round(Number(value));

  if (!Number.isFinite(parsed)) {
    return 64;
  }

  return Math.min(2400, Math.max(64, parsed));
}

function loadBrowserImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onerror = () => reject(new Error("사진 파일을 이미지로 처리하지 못했습니다."));
    image.onload = () => resolve(image);
    image.src = source;
  });
}

async function getImageDimensions(source: string) {
  const image = await loadBrowserImage(source);

  return {
    height: image.height,
    width: image.width
  };
}

function getResizedSitePhotoFileName(file: File, contentType: string) {
  const baseName = file.name.replace(/\.[^.]*$/, "") || "site-photo";
  const extension = contentType === "image/png" ? "png" : "jpg";

  return `${baseName}.${extension}`;
}

async function createResizedSitePhotoFile(
  file: File,
  width: number,
  height: number
) {
  const source = URL.createObjectURL(file);

  try {
    const image = await loadBrowserImage(source);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";

    if (!context) {
      throw new Error("사진을 처리할 수 없습니다.");
    }

    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("사진 파일을 생성하지 못했습니다."));
          }
        },
        contentType,
        contentType === "image/png" ? undefined : 0.88
      );
    });

    return new File(
      [blob],
      getResizedSitePhotoFileName(file, contentType),
      {
        type: contentType
      }
    );
  } finally {
    URL.revokeObjectURL(source);
  }
}

function resizeDailyReportPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";

      if (!source) {
        reject(new Error("사진 파일을 읽지 못했습니다."));
        return;
      }

      const image = new Image();
      image.onerror = () => reject(new Error("사진 파일을 이미지로 처리하지 못했습니다."));
      image.onload = () => {
        const maxEdge = 1400;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("사진을 처리할 수 없습니다."));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

function ProjectSubcontractorsPage({ project }: { project: WorkspaceProject }) {
  const [subcontractors, setSubcontractors] = useState<ProjectSubcontractor[]>(
    () => getProjectSubcontractors(project.id)
  );
  const [draft, setDraft] = useState({
    companyName: "",
    managerNames: [""],
    trade: "",
    contractAmount: "",
    contractStartDate: "",
    contractEndDate: "",
    phone: "",
    email: "",
    notes: "",
    documents: [] as SubcontractorDocument[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<
    string | null
  >(null);
  const selectedSubcontractor =
    subcontractors.find((item) => item.id === selectedSubcontractorId) ?? null;

  function persist(nextProjectSubcontractors: ProjectSubcontractor[]) {
    const otherSubcontractors = readProjectSubcontractors().filter(
      (item) => item.projectId !== project.id
    );
    const normalized = nextProjectSubcontractors
      .map(normalizeProjectSubcontractor)
      .sort((left, right) => left.companyName.localeCompare(right.companyName));

    storeProjectSubcontractors([...otherSubcontractors, ...normalized]);
    setSubcontractors(normalized);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({
      companyName: "",
      managerNames: [""],
      trade: "",
      contractAmount: "",
      contractStartDate: "",
      contractEndDate: "",
      phone: "",
      email: "",
      notes: "",
      documents: []
    });
  }

  function openNewSubcontractorForm() {
    resetDraft();
    setIsFormOpen(true);
  }

  function closeSubcontractorForm() {
    resetDraft();
    setIsFormOpen(false);
  }

  function editSubcontractor(subcontractor: ProjectSubcontractor) {
    setEditingId(subcontractor.id);
    setIsFormOpen(true);
    setSelectedSubcontractorId(null);
    setDraft({
      companyName: subcontractor.companyName,
      managerNames:
        subcontractor.managerNames.length > 0
          ? subcontractor.managerNames
          : [subcontractor.managerName].filter(Boolean),
      trade: subcontractor.trade,
      contractAmount: subcontractor.contractAmount,
      contractStartDate: subcontractor.contractStartDate,
      contractEndDate: subcontractor.contractEndDate,
      phone: subcontractor.phone,
      email: subcontractor.email,
      notes: subcontractor.notes,
      documents: subcontractor.documents
    });
  }

  async function addDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || isReadingFiles) {
      return;
    }

    setIsReadingFiles(true);

    try {
      const documents = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          dataUrl: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString()
        }))
      );

      setDraft((current) => ({
        ...current,
        documents: [...current.documents, ...documents]
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "서류를 업로드하지 못했습니다."
      );
    } finally {
      setIsReadingFiles(false);
    }
  }

  function removeDraftDocument(documentId: string) {
    setDraft((current) => ({
      ...current,
      documents: current.documents.filter((document) => document.id !== documentId)
    }));
  }

  function saveSubcontractor() {
    const companyName = draft.companyName.trim();

    if (!companyName) {
      return;
    }

    const now = new Date().toISOString();
    const managerNames = draft.managerNames
      .map((name) => name.trim())
      .filter(Boolean);
    const nextItem: ProjectSubcontractor = {
      id: editingId ?? crypto.randomUUID(),
      projectId: project.id,
      companyName,
      managerName: managerNames.join(", "),
      managerNames,
      trade: draft.trade.trim(),
      contractAmount: draft.contractAmount.trim(),
      contractStartDate: draft.contractStartDate,
      contractEndDate: draft.contractEndDate,
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      notes: draft.notes.trim(),
      documents: draft.documents,
      createdAt:
        subcontractors.find((item) => item.id === editingId)?.createdAt ?? now,
      updatedAt: now
    };
    const nextSubcontractors = editingId
      ? subcontractors.map((item) => (item.id === editingId ? nextItem : item))
      : [...subcontractors, nextItem];

    persist(nextSubcontractors);
    closeSubcontractorForm();
  }

  function deleteSubcontractor(subcontractorId: string) {
    persist(subcontractors.filter((item) => item.id !== subcontractorId));

    if (selectedSubcontractorId === subcontractorId) {
      setSelectedSubcontractorId(null);
    }

    if (editingId === subcontractorId) {
      closeSubcontractorForm();
    }
  }

  const totalContractAmount = subcontractors.reduce((sum, item) => {
    const amount = Number(item.contractAmount.replace(/[^\d.-]/g, ""));

    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">협력사</h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            협력사 계약 정보와 계약서, 사업자등록증 같은 서류를 프로젝트별로 관리합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <SummaryCard label="등록 협력사" value={`${subcontractors.length}개`} />
          <SummaryCard
            label="계약금액"
            value={
              totalContractAmount > 0
                ? `${totalContractAmount.toLocaleString("ko-KR")}원`
                : "-"
            }
          />
        </div>
      </div>

      <div
        className={`grid gap-5 ${
          isFormOpen ? "xl:grid-cols-[420px_minmax(0,1fr)]" : ""
        }`}
      >
        {isFormOpen ? (
        <section className="rounded-[8px] border border-[#ebebeb] bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">
                {editingId ? "협력사 수정" : "협력사 등록"}
              </h3>
              <p className="mt-1 text-sm text-[#8f8f8f]">
                계약기간과 금액, 담당자 정보를 입력합니다.
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={openNewSubcontractorForm}
              >
                새 등록
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <ProjectSubcontractorTextField
              label="회사 이름"
              value={draft.companyName}
              onChange={(companyName) =>
                setDraft((current) => ({ ...current, companyName }))
              }
            />
            <ProjectSubcontractorManagersField
              managerNames={draft.managerNames}
              onChange={(managerNames) =>
                setDraft((current) => ({ ...current, managerNames }))
              }
            />
            <ProjectSubcontractorTextField
              label="공종"
              value={draft.trade}
              onChange={(trade) => setDraft((current) => ({ ...current, trade }))}
            />
            <ProjectSubcontractorTextField
              label="공사금액"
              value={draft.contractAmount}
              placeholder="예: 120,000,000"
              onChange={(contractAmount) =>
                setDraft((current) => ({ ...current, contractAmount }))
              }
            />
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
              <span className="pt-2 text-sm font-semibold text-[#171717]">
                계약기간
              </span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <input
                  type="date"
                  value={draft.contractStartDate}
                  max={draft.contractEndDate || undefined}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      contractStartDate: event.target.value
                    }))
                  }
                  className={`w-full ${inputClass}`}
                  aria-label="계약 시작일"
                />
                <span className="hidden h-10 items-center text-sm text-[#8f8f8f] sm:flex">
                  ~
                </span>
                <input
                  type="date"
                  value={draft.contractEndDate}
                  min={draft.contractStartDate || undefined}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      contractEndDate: event.target.value
                    }))
                  }
                  className={`w-full ${inputClass}`}
                  aria-label="계약 종료일"
                />
              </div>
            </div>
            <ProjectSubcontractorTextField
              label="연락처"
              value={draft.phone}
              onChange={(phone) => setDraft((current) => ({ ...current, phone }))}
            />
            <ProjectSubcontractorTextField
              label="이메일"
              value={draft.email}
              onChange={(email) => setDraft((current) => ({ ...current, email }))}
            />
            <label className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
              <span className="pt-2 text-sm font-semibold text-[#171717]">비고</span>
              <textarea
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                className={`min-h-24 w-full ${textareaClass}`}
              />
            </label>
          </div>

          <div className="mt-5 rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#171717]">계약 서류</p>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]">
                <Upload size={14} aria-hidden />
                {isReadingFiles ? "업로드 중" : "서류 업로드"}
                <input
                  type="file"
                  className="sr-only"
                  multiple
                  disabled={isReadingFiles}
                  onChange={(event) => void addDocuments(event)}
                />
              </label>
            </div>
            {draft.documents.length > 0 ? (
              <div className="mt-3 space-y-2">
                {draft.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#171717]">
                        {document.fileName}
                      </p>
                      <p className="text-xs text-[#8f8f8f]">
                        {formatBytes(document.fileSize)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                      aria-label={`${document.fileName} 삭제`}
                      onClick={() => removeDraftDocument(document.id)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-[6px] border border-dashed border-[#dedede] bg-white px-3 py-4 text-center text-sm text-[#8f8f8f]">
                업로드된 서류가 없습니다.
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={closeSubcontractorForm}
            >
              닫기
            </button>
            <button type="button" className={secondaryButtonClass} onClick={resetDraft}>
              입력 초기화
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={saveSubcontractor}
              disabled={!draft.companyName.trim()}
            >
              <Save size={15} aria-hidden />
              {editingId ? "수정 저장" : "협력사 등록"}
            </button>
          </div>
        </section>
        ) : (
          <button
            type="button"
            className="flex min-h-[150px] items-center justify-center rounded-[8px] border border-dashed border-[#d9d9d9] bg-white transition hover:border-[#171717] hover:bg-[#fcfcfc]"
            aria-label="협력사 등록"
            onClick={openNewSubcontractorForm}
          >
            <span className="flex size-10 items-center justify-center rounded-[6px] border border-[#e5e5e5] bg-white text-[#171717] shadow-sm">
              <Plus size={20} aria-hidden />
            </span>
          </button>
        )}

        <section className="rounded-[8px] border border-[#ebebeb] bg-white">
          <div className="border-b border-[#ebebeb] px-5 py-4">
            <h3 className="text-base font-semibold">협력사 목록</h3>
            <p className="mt-1 text-sm text-[#8f8f8f]">
              등록된 협력사의 계약 정보와 첨부 서류를 확인합니다.
            </p>
          </div>
          {subcontractors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead className="bg-[#fcfcfc] text-left text-xs font-semibold text-[#6f6f6f]">
                  <tr>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      협력사명
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      공종
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      관리자
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      연락처
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      계약금액
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      계약기간
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3">
                      서류
                    </th>
                    <th className="border-b border-[#ebebeb] px-4 py-3 text-right">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1]">
                  {subcontractors.map((subcontractor) => {
                    const managerDisplay =
                      subcontractor.managerNames.length > 0
                        ? subcontractor.managerNames.join(", ")
                        : subcontractor.managerName || "-";
                    const periodDisplay =
                      subcontractor.contractStartDate ||
                      subcontractor.contractEndDate
                        ? `${subcontractor.contractStartDate || "-"} ~ ${
                            subcontractor.contractEndDate || "-"
                          }`
                        : "-";

                    return (
                      <tr
                        key={subcontractor.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer bg-white transition hover:bg-[#fcfcfc] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#171717]"
                        onClick={() => setSelectedSubcontractorId(subcontractor.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedSubcontractorId(subcontractor.id);
                          }
                        }}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[#171717]">
                            {subcontractor.companyName}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#8f8f8f]">
                            {subcontractor.email || "이메일 미입력"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {subcontractor.trade ? (
                            <span className="rounded-full border border-[#d8eadf] bg-[#f4fbf6] px-2.5 py-1 text-xs font-semibold text-[#25884f]">
                              {subcontractor.trade}
                            </span>
                          ) : (
                            <span className="text-[#8f8f8f]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-[#4d4d4d]">
                          {managerDisplay}
                        </td>
                        <td className="px-4 py-4 text-[#4d4d4d]">
                          {subcontractor.phone || "-"}
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#171717]">
                          {subcontractor.contractAmount
                            ? `${subcontractor.contractAmount}원`
                            : "-"}
                        </td>
                        <td className="px-4 py-4 text-[#4d4d4d]">
                          {periodDisplay}
                        </td>
                        <td className="px-4 py-4 text-[#4d4d4d]">
                          {subcontractor.documents.length}개
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={secondaryButtonClass}
                              onClick={(event) => {
                                event.stopPropagation();
                                editSubcontractor(subcontractor);
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#f0d6d6] bg-white px-4 text-sm font-medium text-[#b42318] transition hover:bg-[#fff7f7]"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteSubcontractor(subcontractor.id);
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
              <div>
                <Building2 size={38} className="mx-auto text-[#c0c0c0]" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-[#4d4d4d]">
                  등록된 협력사가 없습니다.
                </p>
                <p className="mt-1 text-sm text-[#8f8f8f]">
                  위쪽 + 카드에서 첫 협력사를 등록하세요.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedSubcontractor ? (
        <SubcontractorDetailDialog
          subcontractor={selectedSubcontractor}
          onClose={() => setSelectedSubcontractorId(null)}
          onDelete={() => deleteSubcontractor(selectedSubcontractor.id)}
          onEdit={() => editSubcontractor(selectedSubcontractor)}
        />
      ) : null}
    </section>
  );
}

function SubcontractorDetailDialog({
  onClose,
  onDelete,
  onEdit,
  subcontractor
}: {
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  subcontractor: ProjectSubcontractor;
}) {
  const managerDisplay =
    subcontractor.managerNames.length > 0
      ? subcontractor.managerNames.join(", ")
      : subcontractor.managerName || "-";
  const periodDisplay =
    subcontractor.contractStartDate || subcontractor.contractEndDate
      ? `${subcontractor.contractStartDate || "-"} ~ ${
          subcontractor.contractEndDate || "-"
        }`
      : "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subcontractor-detail-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[10px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
              Subcontractor
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3
                id="subcontractor-detail-title"
                className="truncate text-xl font-semibold tracking-[-0.03em]"
              >
                {subcontractor.companyName}
              </h3>
              {subcontractor.trade ? (
                <span className="rounded-full border border-[#d8eadf] bg-[#f4fbf6] px-2.5 py-1 text-xs font-semibold text-[#25884f]">
                  {subcontractor.trade}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onEdit}>
              수정
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#f0d6d6] bg-white px-4 text-sm font-medium text-[#b42318] transition hover:bg-[#fff7f7]"
              onClick={onDelete}
            >
              삭제
            </button>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
              aria-label="협력사 상세 닫기"
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[#f7f7f7] p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SubcontractorInfoPill label="관리자" value={managerDisplay} />
            <SubcontractorInfoPill
              label="연락처"
              value={subcontractor.phone || "-"}
            />
            <SubcontractorInfoPill
              label="이메일"
              value={subcontractor.email || "-"}
            />
            <SubcontractorInfoPill
              label="공사금액"
              value={
                subcontractor.contractAmount
                  ? `${subcontractor.contractAmount}원`
                  : "-"
              }
            />
            <SubcontractorInfoPill label="계약기간" value={periodDisplay} />
            <SubcontractorInfoPill
              label="첨부 서류"
              value={`${subcontractor.documents.length}개`}
            />
          </div>

          <section className="mt-4 rounded-[8px] border border-[#ebebeb] bg-white p-4">
            <h4 className="text-sm font-semibold text-[#171717]">비고</h4>
            <p className="mt-2 min-h-14 whitespace-pre-wrap rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm text-[#4d4d4d]">
              {subcontractor.notes || "입력된 비고가 없습니다."}
            </p>
          </section>

          <section className="mt-4 rounded-[8px] border border-[#ebebeb] bg-white p-4">
            <h4 className="text-sm font-semibold text-[#171717]">
              첨부 서류 {subcontractor.documents.length}개
            </h4>
            {subcontractor.documents.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {subcontractor.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.dataUrl}
                    download={document.fileName}
                    className="flex items-center gap-3 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm transition hover:border-[#171717] hover:bg-white"
                  >
                    <Paperclip
                      size={15}
                      className="shrink-0 text-[#8f8f8f]"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-[#171717]">
                      {document.fileName}
                    </span>
                    <span className="shrink-0 text-xs text-[#8f8f8f]">
                      {formatBytes(document.fileSize)}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-[6px] border border-dashed border-[#dedede] bg-[#fcfcfc] px-3 py-4 text-center text-sm text-[#8f8f8f]">
                첨부된 서류가 없습니다.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProjectSubcontractorTextField({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
      <span className="text-sm font-semibold text-[#171717]">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full ${inputClass}`}
      />
    </label>
  );
}

function ProjectSubcontractorManagersField({
  managerNames,
  onChange
}: {
  managerNames: string[];
  onChange: (managerNames: string[]) => void;
}) {
  const names = managerNames.length > 0 ? managerNames : [""];

  function updateManagerName(index: number, value: string) {
    onChange(names.map((name, nameIndex) => (nameIndex === index ? value : name)));
  }

  function addManagerName() {
    onChange([...names, ""]);
  }

  function removeManagerName(index: number) {
    if (names.length === 1) {
      onChange([""]);
      return;
    }

    onChange(names.filter((_, nameIndex) => nameIndex !== index));
  }

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
      <span className="pt-2 text-sm font-semibold text-[#171717]">관리자</span>
      <div className="space-y-2">
        {names.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={name}
              placeholder="관리자 이름"
              onChange={(event) => updateManagerName(index, event.target.value)}
              className={`w-full ${inputClass}`}
            />
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
              aria-label="관리자 삭제"
              onClick={() => removeManagerName(index)}
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
          onClick={addManagerName}
        >
          <Plus size={14} aria-hidden />
          관리자 추가
        </button>
      </div>
    </div>
  );
}

function SubcontractorInfoPill({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2">
      <p className="text-xs font-medium text-[#8f8f8f]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#171717]">{value}</p>
    </div>
  );
}

function ProjectInfoTable({
  compact = false,
  project
}: {
  compact?: boolean;
  project: WorkspaceProject;
}) {
  const locationDisplay = getProjectLocations(project).join(", ");
  const infoRows = [
    ["프로젝트명", project.name, "위치", locationDisplay],
    ["발주처", project.client ?? "", "시공사", project.contractor ?? ""],
    ["감리", project.inspector ?? "", "설계사", project.designer ?? ""],
    ["공사기간", project.constructionPeriod ?? "", "주요사항", project.projectNotes ?? ""],
    ["기타", project.etc ?? "", "", ""]
  ];

  if (compact) {
    return (
      <section>
        <h3 className="mb-3 text-base font-semibold">프로젝트 기본 정보</h3>
        <div className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {infoRows
                .flatMap((row) =>
                  row[2]
                    ? [
                        [row[0], row[1]],
                        [row[2], row[3]]
                      ]
                    : [[row[0], row[1]]]
                )
                .map((row, rowIndex, rows) => (
                  <tr
                    key={`${row[0]}-${rowIndex}`}
                    className={
                      rowIndex === rows.length - 1
                        ? ""
                        : "border-b border-[#ebebeb]"
                    }
                  >
                    <th className="w-[34%] bg-[#fcfcfc] px-4 py-3 text-left font-medium text-[#4d4d4d]">
                      {row[0]}
                    </th>
                    <td className="px-4 py-3 text-[#171717]">
                      {row[1] || "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-base font-semibold">프로젝트 기본 정보</h3>
      <div className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {infoRows.map((row, rowIndex) => (
              <tr
                key={`${row[0]}-${row[2]}`}
                className={rowIndex === infoRows.length - 1 ? "" : "border-b border-[#ebebeb]"}
              >
                <th className="w-[15%] bg-[#fcfcfc] px-4 py-3 text-left font-medium text-[#4d4d4d]">
                  {row[0]}
                </th>
                <td className="w-[35%] px-4 py-3 text-[#171717]">
                  {row[1] || "-"}
                </td>
                {row[2] ? (
                  <>
                    <th className="w-[15%] border-l border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-left font-medium text-[#4d4d4d]">
                      {row[2]}
                    </th>
                    <td className="w-[35%] px-4 py-3 text-[#171717]">
                      {row[3] || "-"}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3 text-[#171717]" colSpan={2} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type ProjectDocumentTabKey =
  | "daily-report"
  | "inspection-request"
  | "concrete-pour-plan"
  | "material-inspection-request"
  | "crack-management-ledger"
  | "safety-log"
  | "shop-drawing-approval-request";

const projectDocumentTabs: Array<{
  key: ProjectDocumentTabKey;
  label: string;
  code: string;
}> = [
  { key: "daily-report", label: "공사일보", code: "DR" },
  { key: "inspection-request", label: "검측요청서", code: "IR" },
  { key: "concrete-pour-plan", label: "타설계획서", code: "CP" },
  {
    key: "material-inspection-request",
    label: "자재검수요청서",
    code: "MI"
  },
  { key: "crack-management-ledger", label: "균열관리대장", code: "CR" },
  { key: "safety-log", label: "안전관리일지", code: "SF" },
  {
    key: "shop-drawing-approval-request",
    label: "시공상세도승인요청서",
    code: "SD"
  }
];

type ProjectDocumentListItem = {
  date: string;
  documentType?: ProjectDocumentTabKey;
  id: string;
  inspectionRequest?: InspectionRequestDocumentData;
  owner: string;
  projectId?: string;
  report?: ConstructionDailyReport;
  status: string;
  title: string;
};

type StoredProjectDocument = Omit<ProjectDocumentListItem, "report"> & {
  documentType: Exclude<ProjectDocumentTabKey, "daily-report">;
  projectId: string;
};

type InspectionRequestChecklistRow = {
  action?: string;
  contractorFirst?: string;
  contractorSecond?: string;
  item: string;
  standard: string;
  supervisorFirst?: string;
  supervisorSecond?: string;
};

type InspectionRequestTemplateKey = "steel-beam" | "rebar" | "deck-plate";

type InspectionRequestDocumentData = {
  attachmentText: string;
  checklist: {
    drawingNumber: string;
    rows: InspectionRequestChecklistRow[];
    subTrade: string;
    trade: string;
  };
  constructionName: string;
  inspectionPart: string;
  inspectionRequestDate: string;
  inspectionSummary: string;
  locationAndTrade: string;
  requestNo: string;
  requestPeriod: string;
  recipient: string;
  resultAttachmentText: string;
  resultRecipient: string;
  siteManager: string;
  supervisingInspector: string;
};

const inspectionRequestTemplates: Array<{
  key: InspectionRequestTemplateKey;
  label: string;
}> = [
  { key: "steel-beam", label: "철골보" },
  { key: "rebar", label: "철근" },
  { key: "deck-plate", label: "데크플레이트" }
];

const steelBeamInspectionChecklistRows: InspectionRequestChecklistRow[] = [
  {
    item: "1. 설치 위치 및 부재 규격 확인하였는가?",
    standard: "설계도서 / 육안검사"
  },
  {
    item: "2. 보의 수직도 및 수평도는 정확한가?",
    standard: "육안검사 (1/1000)"
  },
  {
    item: "3. 철골 부재의 휨여부 양호한가?",
    standard: "육안검사 (1/1000)"
  },
  {
    item: "4. 고장력 볼트 조임시 와셔를 끼우고 시공했는가?",
    standard: "육안검사"
  },
  {
    item: "5. 볼트 체결력이 유용하게 작용하도록 중앙에서 가장자리 방향으로 조였는가?",
    standard: "육안검사"
  },
  {
    item: "6. 용접부위 및 주변 청결 상태는 확인하였는가?",
    standard: "육안검사"
  },
  {
    item: "7. 현장 용접부의 각장, 길이, 치수의 용접 상태는 적정한가?",
    standard: "설계도서 / 육안검사"
  },
  {
    item: "8. 용접부 이음의 개선은 도면에 승인된 형상으로 하고 있는가?",
    standard: "설계도서 / 육안검사"
  },
  {
    item: "9. 모살용접되는 상호부재는 충분히 밀착하였는가?",
    standard: "육안검사 (2mm 이내)"
  },
  {
    item: "10. 비파괴 검사 실시여부",
    standard: "업체명 / 측정원 확인"
  }
];

const rebarInspectionChecklistRows: InspectionRequestChecklistRow[] = [
  {
    item: "1. 철근의 규격, 수량, 간격은 도면과 일치하는가?",
    standard: "설계도서 / 육안검사"
  },
  {
    item: "2. 철근 이음 및 정착 길이는 기준에 적합한가?",
    standard: "시방서 / 실측"
  },
  {
    item: "3. 피복두께 확보 상태는 적정한가?",
    standard: "스페이서 확인 / 실측"
  },
  {
    item: "4. 개구부, 매립물 주변 보강근은 적정하게 배근되었는가?",
    standard: "설계도서 / 육안검사"
  }
];

const deckPlateInspectionChecklistRows: InspectionRequestChecklistRow[] = [
  {
    item: "1. 데크플레이트 규격 및 설치 위치는 도면과 일치하는가?",
    standard: "설계도서 / 육안검사"
  },
  {
    item: "2. 데크플레이트 처짐, 손상, 변형 여부는 양호한가?",
    standard: "육안검사"
  },
  {
    item: "3. 고정철물 및 용접 상태는 적정한가?",
    standard: "시방서 / 육안검사"
  },
  {
    item: "4. 개구부 보강 및 단부 마감은 적정하게 시공되었는가?",
    standard: "설계도서 / 육안검사"
  }
];

function getInspectionRequestTemplate(
  templateKey: InspectionRequestTemplateKey
) {
  switch (templateKey) {
    case "rebar":
      return {
        checklistRows: rebarInspectionChecklistRows,
        drawingNumber: "구조도 / 철근 배근도",
        inspectionPart: "철근 배근 구간",
        inspectionSummary: "철근 배근, 이음, 정착, 피복두께",
        label: "철근",
        subTrade: "철근 배근 검사",
        trade: "철근콘크리트공사"
      };
    case "deck-plate":
      return {
        checklistRows: deckPlateInspectionChecklistRows,
        drawingNumber: "데크플레이트 시공상세도",
        inspectionPart: "데크플레이트 설치 구간",
        inspectionSummary: "데크플레이트 설치, 고정, 보강 상태",
        label: "데크플레이트",
        subTrade: "데크플레이트 설치 검사",
        trade: "철골공사"
      };
    case "steel-beam":
    default:
      return {
        checklistRows: steelBeamInspectionChecklistRows,
        drawingNumber: "철골 시공상세도",
        inspectionPart: "지하1층 A-Zone 철골 보",
        inspectionSummary: "철골 보 조립, 용접, 비파괴검사",
        label: "철골보",
        subTrade: "수직도 및 수평도, 비파괴 검사",
        trade: "철골공사"
      };
  }
}

function createDailyReportDocument(report: ConstructionDailyReport) {
  return {
    id: report.id,
    documentType: "daily-report",
    projectId: report.projectId,
    title: `${formatKoreanDate(report.reportDate)} 공사일보`,
    date: report.reportDate,
    status: "작성됨",
    owner: report.siteManager || "관리자",
    report
  } satisfies ProjectDocumentListItem;
}

function normalizeStoredProjectDocument(
  document: StoredProjectDocument
): StoredProjectDocument {
  return {
    ...document,
    date: document.date ?? getTodayInputValue(),
    documentType: document.documentType,
    owner: document.owner || "관리자",
    projectId: document.projectId,
    status: document.status || "작성됨",
    title: document.title || "새 문서"
  };
}

function readProjectDocuments() {
  if (typeof window === "undefined") {
    return [] as StoredProjectDocument[];
  }

  const raw = window.localStorage.getItem(PROJECT_DOCUMENTS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as StoredProjectDocument[]).map(
      normalizeStoredProjectDocument
    );
  } catch {
    return [];
  }
}

function storeProjectDocuments(documents: StoredProjectDocument[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROJECT_DOCUMENTS_STORAGE_KEY,
    JSON.stringify(documents)
  );
}

function createInspectionRequestDocumentData(
  project: WorkspaceProject,
  requestDate: string,
  requestNo: string,
  templateKey: InspectionRequestTemplateKey = "steel-beam"
): InspectionRequestDocumentData {
  const template = getInspectionRequestTemplate(templateKey);
  const ownerName =
    project.owner?.name ||
    getProjectOwner(project, {
      username: "admin",
      name: "관리자",
      role: "admin"
    }).name;

  return {
    attachmentText: "검측체크리스트, 사진대지, 도면, 공사참여자 실명부",
    checklist: {
      drawingNumber: template.drawingNumber,
      rows: template.checklistRows,
      subTrade: template.subTrade,
      trade: template.trade
    },
    constructionName: project.name,
    inspectionPart: template.inspectionPart,
    inspectionRequestDate: requestDate,
    inspectionSummary: template.inspectionSummary,
    locationAndTrade: project.name,
    recipient: project.inspector || "감리단",
    requestNo,
    requestPeriod: requestDate,
    resultAttachmentText: "감리원의 체크리스트 검측결과",
    resultRecipient: `${project.contractor || "시공사"} 현장대리인`,
    siteManager: ownerName,
    supervisingInspector: ""
  };
}

function getInspectionRequestData(
  document: ProjectDocumentListItem,
  project: WorkspaceProject
) {
  return (
    document.inspectionRequest ??
    createInspectionRequestDocumentData(project, document.date, document.title)
  );
}

function getCalendarDocumentTitle(document: ProjectDocumentListItem) {
  if (document.documentType === "daily-report") {
    return "공사일보";
  }

  return document.title
    .replace(/^\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+/, "")
    .replace(/^\d{4}-\d{2}-\d{2}\s+/, "")
    .trim();
}

function ProjectDocumentsPage({ project }: { project: WorkspaceProject }) {
  const [activeTab, setActiveTab] =
    useState<ProjectDocumentTabKey>("daily-report");
  const [documents, setDocuments] = useState<StoredProjectDocument[]>([]);
  const [reports, setReports] = useState<ConstructionDailyReport[]>([]);
  const [dailyReportRefreshKey, setDailyReportRefreshKey] = useState(0);
  const [dailyReportPdfEndDate, setDailyReportPdfEndDate] = useState("");
  const [dailyReportPdfStartDate, setDailyReportPdfStartDate] = useState("");
  const [editingDocumentOnOpenId, setEditingDocumentOnOpenId] = useState<
    string | null
  >(null);
  const [isNewDocumentMenuOpen, setIsNewDocumentMenuOpen] = useState(false);
  const [projectSubcontractorNames, setProjectSubcontractorNames] = useState<
    string[]
  >([]);
  const [selectedDocument, setSelectedDocument] =
    useState<ProjectDocumentListItem | null>(null);
  const activeDocument = projectDocumentTabs.find((tab) => tab.key === activeTab)!;
  const dailyReportDocuments = reports.map(createDailyReportDocument);
  const activeStoredDocuments = documents.filter(
    (document) =>
      document.projectId === project.id && document.documentType === activeTab
  );
  const calendarStoredDocuments = documents.filter(
    (document) => document.projectId === project.id
  );
  const activeDocumentCount =
    activeTab === "daily-report"
      ? dailyReportDocuments.length
      : activeStoredDocuments.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReports(getProjectDailyReports(project.id));
      setDocuments(readProjectDocuments());
      setProjectSubcontractorNames(getProjectSubcontractorNames(project.id));
    });

    return () => {
      window.clearTimeout(timer);
    };
  }, [project.id]);

  function refreshDailyReportDocuments() {
    setReports(getProjectDailyReports(project.id));
    setDailyReportRefreshKey((value) => value + 1);
  }

  function createDailyReportManagedDocument() {
    const reportDate = getTodayInputValue();
    const existingReport = reports.find(
      (report) => report.reportDate === reportDate
    );

    setActiveTab("daily-report");
    setIsNewDocumentMenuOpen(false);

    if (existingReport) {
      setEditingDocumentOnOpenId(existingReport.id);
      setSelectedDocument(createDailyReportDocument(existingReport));
      return;
    }

    const sourceReport = getLatestDailyReportSchemaSource(reports);
    const defaultReport = createDefaultDailyReport(
      project,
      reportDate,
      sourceReport
    );
    const nextReport = applyDailyReportTotals(
      defaultReport,
      getPreviousDailyReport(reports, defaultReport)
    );
    const otherReports = readDailyReports().filter(
      (report) => report.projectId !== project.id
    );
    const nextProjectReports = syncProjectDailyReports([nextReport, ...reports], {
      contractorLaborRows: nextReport.contractorLaborRows,
      subcontractorLaborRows: nextReport.subcontractorLaborRows,
      equipmentRows: nextReport.equipmentRows,
      materialRows: nextReport.materialRows
    });

    storeDailyReports([...otherReports, ...nextProjectReports]);
    setReports(nextProjectReports);
    setDailyReportRefreshKey((value) => value + 1);
    setEditingDocumentOnOpenId(nextReport.id);
    setSelectedDocument(createDailyReportDocument(nextReport));
  }

  function createStoredProjectDocument(
    documentType: Exclude<ProjectDocumentTabKey, "daily-report">,
    inspectionTemplateKey: InspectionRequestTemplateKey = "steel-beam",
    documentDate = getTodayInputValue()
  ) {
    const documentMeta = projectDocumentTabs.find(
      (tab) => tab.key === documentType
    );

    if (!documentMeta) {
      return;
    }

    const inspectionTemplate = getInspectionRequestTemplate(inspectionTemplateKey);
    const title =
      documentType === "inspection-request"
        ? `${formatKoreanDate(documentDate)} ${inspectionTemplate.label} 검측요청서`
        : `${formatKoreanDate(documentDate)} ${documentMeta.label}`;
    const nextDocument: StoredProjectDocument = {
      id: crypto.randomUUID(),
      projectId: project.id,
      documentType,
      title,
      date: documentDate,
      inspectionRequest:
        documentType === "inspection-request"
          ? createInspectionRequestDocumentData(
              project,
              documentDate,
              title,
              inspectionTemplateKey
            )
          : undefined,
      owner: "관리자",
      status: "작성됨"
    };
    const nextDocuments = [nextDocument, ...readProjectDocuments()];

    storeProjectDocuments(nextDocuments);
    setDocuments(nextDocuments);
    setActiveTab(documentType);
    setIsNewDocumentMenuOpen(false);
    setEditingDocumentOnOpenId(nextDocument.id);
    setSelectedDocument(nextDocument);
  }

  function createActiveTabDocument() {
    if (activeTab === "daily-report") {
      createDailyReportManagedDocument();
      return;
    }

    if (activeTab === "inspection-request") {
      setIsNewDocumentMenuOpen((value) => !value);
      return;
    }

    createStoredProjectDocument(activeTab);
  }

  function saveDailyReportDocument(nextReport: ConstructionDailyReport) {
    const normalizedReport = applyDailyReportTotals(
      nextReport,
      getPreviousDailyReport(reports, nextReport)
    );
    const updatedReport = {
      ...normalizedReport,
      updatedAt: new Date().toISOString()
    };
    const otherReports = readDailyReports().filter(
      (report) => report.projectId !== project.id
    );
    const nextProjectReports = syncProjectDailyReports(
      [
        ...reports.filter((report) => report.id !== updatedReport.id),
        updatedReport
      ],
      {
        contractorLaborRows: updatedReport.contractorLaborRows,
        subcontractorLaborRows: updatedReport.subcontractorLaborRows,
        equipmentRows: updatedReport.equipmentRows,
        materialRows: updatedReport.materialRows
      }
    );

    storeDailyReports([...otherReports, ...nextProjectReports]);

    const storedProjectReports = getProjectDailyReports(project.id);
    const storedUpdatedReport =
      storedProjectReports.find((report) => report.id === updatedReport.id) ??
      updatedReport;

    setReports(storedProjectReports);
    setDailyReportRefreshKey((value) => value + 1);
    setSelectedDocument(createDailyReportDocument(storedUpdatedReport));
  }

  function saveInspectionRequestDocument(
    document: ProjectDocumentListItem,
    nextInspectionRequest: InspectionRequestDocumentData
  ) {
    if (
      !document.projectId ||
      document.documentType !== "inspection-request"
    ) {
      return;
    }

    const nextDocuments = readProjectDocuments().map((item) =>
      item.id === document.id
        ? {
            ...item,
            date: nextInspectionRequest.inspectionRequestDate || item.date,
            inspectionRequest: nextInspectionRequest,
            owner: nextInspectionRequest.siteManager || item.owner,
            status: "작성됨"
          }
        : item
    );
    const updatedDocument =
      nextDocuments.find((item) => item.id === document.id) ?? document;

    storeProjectDocuments(nextDocuments);
    setDocuments(nextDocuments);
    setSelectedDocument(updatedDocument);
  }

  function deleteDailyReportDocument(document: ProjectDocumentListItem) {
    if (!document.report) {
      return;
    }

    if (!window.confirm(`${document.title} 문서를 삭제하시겠습니까?`)) {
      return;
    }

    storeDailyReports(
      readDailyReports().filter((report) => report.id !== document.report?.id)
    );
    setReports(getProjectDailyReports(project.id));
    setDailyReportRefreshKey((value) => value + 1);

    if (selectedDocument?.id === document.id) {
      setSelectedDocument(null);
    }
  }

  function deleteStoredProjectDocument(document: ProjectDocumentListItem) {
    if (!document.projectId || !document.documentType) {
      return;
    }

    if (!window.confirm(`${document.title} 문서를 삭제하시겠습니까?`)) {
      return;
    }

    const nextDocuments = readProjectDocuments().filter(
      (item) => item.id !== document.id
    );

    storeProjectDocuments(nextDocuments);
    setDocuments(nextDocuments);

    if (selectedDocument?.id === document.id) {
      setSelectedDocument(null);
    }
  }

  function exportDailyReportsByDate() {
    if (!dailyReportPdfStartDate && !dailyReportPdfEndDate) {
      window.alert("PDF로 저장할 날짜를 선택해주세요.");
      return;
    }

    const startDate = dailyReportPdfStartDate || dailyReportPdfEndDate;
    const endDate = dailyReportPdfEndDate || dailyReportPdfStartDate;
    const [fromDate, toDate] =
      startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    const selectedReports = reports.filter(
      (report) => report.reportDate >= fromDate && report.reportDate <= toDate
    );

    void downloadDailyReportsPdf(project, selectedReports).catch((error) => {
      window.alert(
        error instanceof Error ? error.message : "PDF 저장에 실패했습니다."
      );
    });
  }

  function openProjectDocumentTab(tabKey: ProjectDocumentTabKey) {
    setActiveTab(tabKey);
    setIsNewDocumentMenuOpen(false);
    window.requestAnimationFrame(() => {
      document
        .getElementById("project-document-manager")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section>
      <div className="mb-8">
        <DailyReportSection
          documents={calendarStoredDocuments}
          project={project}
          onCreateProjectDocument={(
            documentType,
            documentDate,
            inspectionTemplateKey
          ) =>
            createStoredProjectDocument(
              documentType,
              inspectionTemplateKey,
              documentDate
            )
          }
          refreshKey={dailyReportRefreshKey}
          onOpenDocumentTab={openProjectDocumentTab}
          onOpenProjectDocument={setSelectedDocument}
          onReportsChange={refreshDailyReportDocuments}
        />
      </div>

      <div
        id="project-document-manager"
        className="mb-5 flex scroll-mt-8 flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            문서관리
          </h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">{project.name}</p>
        </div>
      </div>

      <div className="rounded-[8px] border border-[#ebebeb] bg-white">
        <div className="border-b border-[#ebebeb] px-4 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 gap-1 overflow-x-auto">
              {projectDocumentTabs.map((tab) => {
                const isActive = tab.key === activeTab;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`flex h-10 shrink-0 items-center gap-2 rounded-t-[8px] border border-b-0 px-4 text-sm font-medium transition ${
                      isActive
                        ? "border-[#171717] bg-white text-[#171717]"
                        : "border-[#ebebeb] bg-[#fcfcfc] text-[#4d4d4d] hover:bg-white hover:text-[#171717]"
                    }`}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setIsNewDocumentMenuOpen(false);
                    }}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-[5px] text-[11px] font-semibold ${
                        isActive
                          ? "bg-[#171717] text-white"
                          : "bg-white text-[#8f8f8f]"
                      }`}
                    >
                      {tab.code}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="relative shrink-0 pb-1">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={createActiveTabDocument}
              >
                <Plus size={15} aria-hidden />
                새 문서
              </button>
              {activeTab === "inspection-request" && isNewDocumentMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white py-1 shadow-xl">
                  {inspectionRequestTemplates.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
                      onClick={() =>
                        createStoredProjectDocument(
                          "inspection-request",
                          template.key
                        )
                      }
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[#ebebeb] bg-[#fcfcfc] p-4 lg:border-b-0 lg:border-r">
            <div className="rounded-[8px] border border-[#ebebeb] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
                Document
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                {activeDocument.label}
              </h3>
              <p className="mt-3 text-sm text-[#4d4d4d]">
                {activeDocumentCount}건
              </p>
            </div>

            <div className="mt-4 rounded-[8px] border border-[#ebebeb] bg-white p-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="문서 검색"
                  className="h-10 w-full rounded-[6px] border border-[#ebebeb] bg-white pl-9 pr-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                />
              </div>
            </div>

            {activeTab === "daily-report" ? (
              <div className="mt-4 rounded-[8px] border border-[#ebebeb] bg-white p-3">
                <p className="text-xs font-semibold text-[#4d4d4d]">
                  공사일보 PDF 저장
                </p>
                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
                    시작일
                    <input
                      type="date"
                      value={dailyReportPdfStartDate}
                      onChange={(event) =>
                        setDailyReportPdfStartDate(event.target.value)
                      }
                      className="h-9 rounded-[6px] border border-[#ebebeb] bg-white px-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
                    종료일
                    <input
                      type="date"
                      value={dailyReportPdfEndDate}
                      onChange={(event) =>
                        setDailyReportPdfEndDate(event.target.value)
                      }
                      className="h-9 rounded-[6px] border border-[#ebebeb] bg-white px-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={exportDailyReportsByDate}
                  >
                    <Download size={15} aria-hidden />
                    PDF 저장
                  </button>
                </div>
              </div>
            ) : null}
          </aside>

          <div className="p-4">
            {activeTab === "daily-report" ? (
              <DocumentList
                documents={dailyReportDocuments}
                emptyTitle="등록된 공사일보가 없습니다."
                onDeleteDocument={deleteDailyReportDocument}
                onOpenDocument={setSelectedDocument}
              />
            ) : (
              <DocumentList
                documents={activeStoredDocuments}
                emptyTitle={`${activeDocument.label} 문서가 없습니다.`}
                onDeleteDocument={deleteStoredProjectDocument}
                onOpenDocument={setSelectedDocument}
              />
            )}
          </div>
        </div>
      </div>

      {selectedDocument ? (
        <DocumentPreviewDialog
          key={selectedDocument.id}
          document={selectedDocument}
          initialEditing={selectedDocument.id === editingDocumentOnOpenId}
          project={project}
          subcontractorOptions={projectSubcontractorNames}
          onClose={() => {
            setEditingDocumentOnOpenId(null);
            setSelectedDocument(null);
          }}
          onSaveInspectionRequest={saveInspectionRequestDocument}
          onSaveReport={saveDailyReportDocument}
        />
      ) : null}
    </section>
  );
}

function DocumentList({
  documents,
  emptyTitle,
  onDeleteDocument,
  onOpenDocument
}: {
  documents: ProjectDocumentListItem[];
  emptyTitle: string;
  onDeleteDocument?: (document: ProjectDocumentListItem) => void;
  onOpenDocument: (document: ProjectDocumentListItem) => void;
}) {
  if (documents.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[8px] border border-dashed border-[#ebebeb] bg-[#fcfcfc] text-center">
        <div>
          <FileText size={36} className="mx-auto text-[#c0c0c0]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-[#4d4d4d]">
            {emptyTitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white">
      <div className="grid grid-cols-[minmax(220px,1fr)_140px_120px_120px_52px] border-b border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-xs font-semibold text-[#4d4d4d] max-md:hidden">
        <div>문서명</div>
        <div>작성일</div>
        <div>담당자</div>
        <div>상태</div>
        <div className="text-center">삭제</div>
      </div>
      {documents.map((document) => (
        <div
          key={document.id}
          className="grid w-full grid-cols-[minmax(220px,1fr)_140px_120px_120px_52px] items-stretch border-b border-[#f2f2f2] text-sm last:border-b-0 max-md:grid-cols-[minmax(0,1fr)_52px]"
        >
          <button
            type="button"
            className="col-span-4 grid grid-cols-[minmax(220px,1fr)_140px_120px_120px] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#fcfcfc] max-md:col-span-1 max-md:grid-cols-1"
            onClick={() => onOpenDocument(document)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white text-[#8f8f8f]">
                <ClipboardList size={17} aria-hidden />
              </span>
              <span className="truncate font-semibold text-[#171717]">
                {document.title}
              </span>
            </div>
            <div className="text-[#4d4d4d]">{formatKoreanDate(document.date)}</div>
            <div className="text-[#4d4d4d]">{document.owner}</div>
            <div>
              <span className="inline-flex rounded-full border border-[#d8eadf] bg-[#f4fbf6] px-2.5 py-1 text-xs font-semibold text-[#25884f]">
                {document.status}
              </span>
            </div>
          </button>
          <div className="flex items-center justify-center px-2">
            {onDeleteDocument ? (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-[4px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#d92d20]"
                aria-label={`${document.title} 삭제`}
                title="문서 삭제"
                onClick={() => onDeleteDocument(document)}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentPreviewDialog({
  document,
  initialEditing = false,
  project,
  subcontractorOptions,
  onClose,
  onSaveInspectionRequest,
  onSaveReport
}: {
  document: ProjectDocumentListItem;
  initialEditing?: boolean;
  project: WorkspaceProject;
  subcontractorOptions: string[];
  onClose: () => void;
  onSaveInspectionRequest: (
    document: ProjectDocumentListItem,
    inspectionRequest: InspectionRequestDocumentData
  ) => void;
  onSaveReport: (report: ConstructionDailyReport) => void;
}) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [draftReport, setDraftReport] = useState<ConstructionDailyReport | null>(
    document.report ?? null
  );
  const [draftInspectionRequest, setDraftInspectionRequest] =
    useState<InspectionRequestDocumentData | null>(
      document.documentType === "inspection-request"
        ? getInspectionRequestData(document, project)
        : null
    );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const isInspectionRequest = document.documentType === "inspection-request";
  const printableInspectionRequest = isInspectionRequest
    ? draftInspectionRequest ?? getInspectionRequestData(document, project)
    : null;
  const canEditDocument = Boolean(draftReport || draftInspectionRequest);

  function cancelEdit() {
    setDraftReport(document.report ?? null);
    setDraftInspectionRequest(
      isInspectionRequest ? getInspectionRequestData(document, project) : null
    );
    setIsEditing(false);
  }

  function saveEdit() {
    if (draftReport) {
      onSaveReport(draftReport);
      setIsEditing(false);
      return;
    }

    if (draftInspectionRequest) {
      onSaveInspectionRequest(document, draftInspectionRequest);
    }

    setIsEditing(false);
  }

  async function loadKmaWeather() {
    if (!draftReport || isLoadingWeather) {
      return;
    }

    setIsLoadingWeather(true);

    try {
      const forecastDate = draftReport.reportDate.replaceAll("-", "");
      const response = await fetch(`/api/weather/kma?date=${forecastDate}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as KmaWeatherResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "기상청 날씨를 불러오지 못했습니다.");
      }

      setDraftReport({
        ...draftReport,
        weather: payload.weather ?? draftReport.weather,
        lowTemp: payload.lowTemp ?? draftReport.lowTemp,
        highTemp: payload.highTemp ?? draftReport.highTemp
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "기상청 날씨를 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingWeather(false);
    }
  }

  function printCurrentDocument() {
    if (draftReport) {
      printDailyReportsAsPdf(project, [draftReport]);
      return;
    }

    if (printableInspectionRequest) {
      printInspectionRequestAsPdf(project, document, printableInspectionRequest);
    }
  }

  function downloadCurrentDocumentPdf() {
    const downloadPromise = draftReport
      ? downloadDailyReportsPdf(project, [draftReport])
      : printableInspectionRequest
        ? downloadInspectionRequestPdf(project, document, printableInspectionRequest)
        : Promise.resolve();

    void downloadPromise.catch((error) => {
      window.alert(
        error instanceof Error ? error.message : "PDF 저장에 실패했습니다."
      );
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[10px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
              Document Preview
            </p>
            <h3 className="mt-1 truncate text-xl font-semibold tracking-[-0.03em]">
              {document.title}
            </h3>
            <p className="mt-1 text-sm text-[#4d4d4d]">
              {project.name} · {formatKoreanDate(document.date)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEditDocument ? (
              isEditing ? (
                <>
                  {draftReport || printableInspectionRequest ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={printCurrentDocument}
                    >
                      <Printer size={15} aria-hidden />
                      출력
                    </button>
                  ) : null}
                  {draftReport || printableInspectionRequest ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={downloadCurrentDocumentPdf}
                    >
                      <Download size={15} aria-hidden />
                      PDF 저장
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={cancelEdit}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={saveEdit}
                  >
                    <Save size={15} aria-hidden />
                    저장
                  </button>
                  {draftReport ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => void loadKmaWeather()}
                      disabled={isLoadingWeather}
                    >
                      <CloudSun size={15} aria-hidden />
                      {isLoadingWeather ? "불러오는 중" : "기상청 불러오기"}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {draftReport || printableInspectionRequest ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={printCurrentDocument}
                    >
                      <Printer size={15} aria-hidden />
                      출력
                    </button>
                  ) : null}
                  {draftReport || printableInspectionRequest ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={downloadCurrentDocumentPdf}
                    >
                      <Download size={15} aria-hidden />
                      PDF 저장
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => setIsEditing(true)}
                  >
                    수정
                  </button>
                </>
              )
            ) : null}
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
              aria-label="문서 팝업 닫기"
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto bg-[#f7f7f7] p-5">
          {draftReport ? (
            <DailyReportDocumentPreview
              isEditing={isEditing}
              previousReport={
                draftReport
                  ? getPreviousDailyReport(getProjectDailyReports(project.id), draftReport)
                  : null
              }
              report={draftReport}
              subcontractorOptions={subcontractorOptions}
              onChange={setDraftReport}
            />
          ) : document.documentType === "inspection-request" ? (
            <InspectionRequestDocumentPreview
              data={printableInspectionRequest!}
              isEditing={isEditing}
              onChange={setDraftInspectionRequest}
            />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[8px] border border-dashed border-[#ebebeb] bg-white text-center">
              <div>
                <FileText
                  size={38}
                  className="mx-auto text-[#c0c0c0]"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-semibold text-[#4d4d4d]">
                  미리보기 데이터가 없습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InspectionRequestDocumentPreview({
  data,
  isEditing = false,
  onChange
}: {
  data: InspectionRequestDocumentData;
  isEditing?: boolean;
  onChange?: (data: InspectionRequestDocumentData) => void;
}) {
  const coverRows: Array<{
    key: keyof InspectionRequestDocumentData;
    label: string;
    multiline?: boolean;
  }> = [
    { key: "requestNo", label: "번호" },
    { key: "recipient", label: "수신" },
    { key: "locationAndTrade", label: "위치 및 공종" },
    { key: "inspectionPart", label: "검측 부위" },
    { key: "inspectionRequestDate", label: "검측 요구 일시" },
    { key: "inspectionSummary", label: "검측 사항", multiline: true }
  ];
  function updateData(patch: Partial<InspectionRequestDocumentData>) {
    onChange?.({ ...data, ...patch });
  }

  function updateChecklist(
    patch: Partial<InspectionRequestDocumentData["checklist"]>
  ) {
    onChange?.({ ...data, checklist: { ...data.checklist, ...patch } });
  }

  function updateChecklistRow(
    index: number,
    patch: Partial<InspectionRequestChecklistRow>
  ) {
    onChange?.({
      ...data,
      checklist: {
        ...data.checklist,
        rows: data.checklist.rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, ...patch } : row
        )
      }
    });
  }

  function addChecklistRow() {
    onChange?.({
      ...data,
      checklist: {
        ...data.checklist,
        rows: [
          ...data.checklist.rows,
          {
            item: "",
            standard: ""
          }
        ]
      }
    });
  }

  function removeChecklistRow(index: number) {
    onChange?.({
      ...data,
      checklist: {
        ...data.checklist,
        rows: data.checklist.rows.filter((_, rowIndex) => rowIndex !== index)
      }
    });
  }

  function renderEditableValue(
    value: string,
    onValueChange: (value: string) => void,
    multiline = false
  ) {
    if (!isEditing) {
      return value || "-";
    }

    if (multiline) {
      return (
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-h-20 w-full resize-y rounded-[4px] border border-[#d7d7d7] px-2 py-2 text-sm outline-none transition focus:border-[#171717]"
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-9 w-full rounded-[4px] border border-[#d7d7d7] px-2 text-sm outline-none transition focus:border-[#171717]"
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <section className="rounded-[8px] border border-[#d7d7d7] bg-white p-6 shadow-sm">
        <h3 className="text-center text-2xl font-semibold tracking-[0.16em]">
          검 측 요 청 서
        </h3>
        <div className="mt-6 grid gap-0 overflow-hidden border border-[#171717] text-sm">
          {coverRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[150px_minmax(0,1fr)]">
              <div className="border-b border-r border-[#d7d7d7] bg-[#fcfcfc] px-4 py-3 font-semibold text-[#171717]">
                {row.label}
              </div>
              <div className="border-b border-[#d7d7d7] px-4 py-3 text-[#171717]">
                {renderEditableValue(
                  String(data[row.key] ?? ""),
                  (value) =>
                    updateData({
                      [row.key]: value
                    } as Partial<InspectionRequestDocumentData>),
                  row.multiline
                )}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[150px_minmax(0,1fr)]">
            <div className="border-r border-[#d7d7d7] bg-[#fcfcfc] px-4 py-3 font-semibold text-[#171717]">
              첨부
            </div>
            <div className="px-4 py-3 text-[#171717]">
              {renderEditableValue(data.attachmentText, (value) =>
                updateData({ attachmentText: value })
              )}
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#4d4d4d]">
          다음과 같은 세부공종에 대하여 검측요청하오니 검사 후 승인하여
          주시기 바랍니다.
        </p>

        <div className="mt-6 grid gap-2 text-sm text-[#171717]">
          <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
            <span>공사명 :</span>
            <span>
              {renderEditableValue(data.constructionName, (value) =>
                updateData({ constructionName: value })
              )}
            </span>
          </div>
          <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
            <span>현장대리인 :</span>
            <span>
              {renderEditableValue(data.siteManager, (value) =>
                updateData({ siteManager: value })
              )}{" "}
              (인)
            </span>
          </div>
        </div>

        <div className="mt-8 border-t border-[#171717] pt-5">
          <h4 className="text-center text-lg font-semibold tracking-[0.12em]">
            검 측 결 과 통 보 서
          </h4>
          <div className="mt-4 grid gap-2 text-sm text-[#171717]">
            <p>검측요청서 번호 {data.requestNo}에 대한 검측결과를 통보합니다.</p>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
              <span>수신 :</span>
              <span>
                {renderEditableValue(data.resultRecipient, (value) =>
                  updateData({ resultRecipient: value })
                )}
              </span>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
              <span>검측일자 :</span>
              <span>
                {renderEditableValue(data.inspectionRequestDate, (value) =>
                  updateData({ inspectionRequestDate: value })
                )}
              </span>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
              <span>첨부 :</span>
              <span>
                {renderEditableValue(data.resultAttachmentText, (value) =>
                  updateData({ resultAttachmentText: value })
                )}
              </span>
            </div>
            <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2">
              <span>총괄 감리 책임자 :</span>
              <span>
                {renderEditableValue(data.supervisingInspector, (value) =>
                  updateData({ supervisingInspector: value })
                )}{" "}
                (인)
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-[#d7d7d7] bg-white p-6 shadow-sm">
        <h3 className="text-center text-2xl font-semibold tracking-[0.12em]">
          검 측 체 크 리 스 트
        </h3>

        <div className="mt-6 grid grid-cols-2 overflow-hidden border border-[#171717] text-sm max-md:grid-cols-1">
          {[
            {
              label: "공종 CODE No.",
              value: data.requestNo,
              onValueChange: (value: string) => updateData({ requestNo: value })
            },
            {
              label: "검측일자",
              value: data.requestPeriod,
              onValueChange: (value: string) =>
                updateData({ requestPeriod: value })
            },
            {
              label: "공종",
              value: data.checklist.trade,
              onValueChange: (value: string) => updateChecklist({ trade: value })
            },
            {
              label: "위치 및 부위",
              value: data.inspectionPart,
              onValueChange: (value: string) =>
                updateData({ inspectionPart: value })
            },
            {
              label: "세부공종",
              value: data.checklist.subTrade,
              onValueChange: (value: string) =>
                updateChecklist({ subTrade: value })
            },
            {
              label: "도면번호",
              value: data.checklist.drawingNumber,
              onValueChange: (value: string) =>
                updateChecklist({ drawingNumber: value })
            }
          ].map((field) => (
            <div
              key={field.label}
              className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#d7d7d7]"
            >
              <div className="border-r border-[#d7d7d7] bg-[#fcfcfc] px-3 py-2 font-semibold">
                {field.label}
              </div>
              <div className="px-3 py-2">
                {renderEditableValue(field.value, field.onValueChange)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[47%]" />
              <col className="w-[18%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#fcfcfc]">
                <th rowSpan={2} className="border border-[#171717] px-3 py-2">
                  검사항목
                </th>
                <th rowSpan={2} className="border border-[#171717] px-3 py-2">
                  검사기준
                </th>
                <th colSpan={2} className="border border-[#171717] px-3 py-2">
                  시공자
                </th>
                <th colSpan={2} className="border border-[#171717] px-3 py-2">
                  감리자
                </th>
                <th rowSpan={2} className="border border-[#171717] px-3 py-2">
                  조치사항
                </th>
              </tr>
              <tr className="bg-[#fcfcfc]">
                <th className="border border-[#171717] px-3 py-2">1차</th>
                <th className="border border-[#171717] px-3 py-2">2차</th>
                <th className="border border-[#171717] px-3 py-2">1차</th>
                <th className="border border-[#171717] px-3 py-2">2차</th>
              </tr>
            </thead>
            <tbody>
              {data.checklist.rows.map((row, rowIndex) => (
                <tr key={`${row.item}-${rowIndex}`}>
                  <td className="border border-[#d7d7d7] px-3 py-2 font-medium">
                    {isEditing ? (
                      <textarea
                        value={row.item}
                        rows={3}
                        onChange={(event) =>
                          updateChecklistRow(rowIndex, {
                            item: event.target.value
                          })
                        }
                        className="block min-h-14 w-full resize-none overflow-hidden rounded-[4px] border border-transparent bg-transparent px-1 py-1 text-sm font-medium leading-6 outline-none transition focus:border-[#171717] focus:bg-white"
                      />
                    ) : (
                      row.item || "-"
                    )}
                  </td>
                  <td className="whitespace-pre-line border border-[#d7d7d7] px-3 py-2">
                    {isEditing ? (
                      <textarea
                        value={row.standard}
                        rows={3}
                        onChange={(event) =>
                          updateChecklistRow(rowIndex, {
                            standard: event.target.value
                          })
                        }
                        className="block min-h-14 w-full resize-none overflow-hidden rounded-[4px] border border-transparent bg-transparent px-1 py-1 text-sm leading-6 outline-none transition focus:border-[#171717] focus:bg-white"
                      />
                    ) : (
                      row.standard || "-"
                    )}
                  </td>
                  {(
                    [
                      "contractorFirst",
                      "contractorSecond",
                      "supervisorFirst",
                      "supervisorSecond"
                    ] as Array<keyof InspectionRequestChecklistRow>
                  ).map((key) => (
                    <td
                      key={`${row.item}-${rowIndex}-${key}`}
                      className="border border-[#d7d7d7] px-3 py-2 text-center text-[#4d4d4d]"
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(row[key] ?? "")}
                          onChange={(event) =>
                            updateChecklistRow(rowIndex, {
                              [key]: event.target.value
                            } as Partial<InspectionRequestChecklistRow>)
                          }
                          className="h-8 w-full rounded-[4px] border border-transparent bg-transparent px-1 text-center text-sm outline-none transition focus:border-[#171717] focus:bg-white"
                        />
                      ) : (
                        String(row[key] || "-")
                      )}
                    </td>
                  ))}
                  <td className="border border-[#d7d7d7] px-3 py-2 text-center text-[#4d4d4d]">
                    {isEditing ? (
                      <div className="flex min-w-0 items-center gap-1">
                        <input
                          type="text"
                          value={row.action ?? ""}
                          onChange={(event) =>
                            updateChecklistRow(rowIndex, {
                              action: event.target.value
                            })
                          }
                          className="h-8 min-w-0 flex-1 rounded-[4px] border border-transparent bg-transparent px-1 text-sm outline-none transition focus:border-[#171717] focus:bg-white"
                        />
                        <button
                          type="button"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[4px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                          aria-label="검측 체크리스트 항목 삭제"
                          onClick={() => removeChecklistRow(rowIndex)}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      row.action || "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEditing ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={addChecklistRow}
            >
              <Plus size={15} aria-hidden />
              항목 추가
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm max-md:grid-cols-1">
          <div className="rounded-[6px] border border-[#d7d7d7] px-4 py-3">
            시공자 점검 : 성명 (인)
          </div>
          <div className="rounded-[6px] border border-[#d7d7d7] px-4 py-3">
            감리원 검측 : 성명 (인)
          </div>
          <div className="rounded-[6px] border border-[#d7d7d7] px-4 py-3">
            시공자 재점검 : 성명 (인)
          </div>
          <div className="rounded-[6px] border border-[#d7d7d7] px-4 py-3">
            감리원 재검측 : 성명 (인)
          </div>
        </div>
        <p className="mt-4 text-xs text-[#6f6f6f]">※ 검측사진첨부.</p>
      </section>
    </div>
  );
}

function DailyReportDocumentPreview({
  isEditing,
  onChange,
  previousReport = null,
  report,
  subcontractorOptions = []
}: {
  isEditing: boolean;
  onChange: (report: ConstructionDailyReport) => void;
  previousReport?: ConstructionDailyReport | null;
  report: ConstructionDailyReport;
  subcontractorOptions?: string[];
}) {
  const contractorLabor = isEditing
    ? report.contractorLaborRows
    : report.contractorLaborRows.filter(hasAnyDailyReportRowValue);
  const subcontractorLabor = isEditing
    ? report.subcontractorLaborRows
    : report.subcontractorLaborRows.filter(hasAnyDailyReportRowValue);
  const materialRows = isEditing
    ? report.materialRows
    : report.materialRows.filter(hasAnyDailyReportRowValue);
  const equipmentRows = isEditing
    ? report.equipmentRows
    : report.equipmentRows.filter(hasAnyDailyReportRowValue);

  function updateReport(
    patch: Partial<
      Pick<
        ConstructionDailyReport,
        | "reportDate"
        | "weather"
        | "lowTemp"
        | "highTemp"
        | "siteManager"
        | "notes"
        | "photos"
      >
    >
  ) {
    onChange({
      ...report,
      ...patch
    });
  }

  function updateWorkItem(
    itemId: string,
    patch: Partial<Pick<DailyReportWorkItem, "trade" | "today" | "tomorrow">>
  ) {
    onChange({
      ...report,
      workItems: report.workItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      )
    });
  }

  function updateLaborRow(
    collection: "contractorLaborRows" | "subcontractorLaborRows",
    rowId: string,
    patch: Partial<Omit<DailyReportLaborRow, "id">>
  ) {
    onChange(
      applyDailyReportTotals(
        {
          ...report,
          [collection]: report[collection].map((row) =>
            row.id === rowId ? { ...row, ...patch } : row
          )
        },
        previousReport
      )
    );
  }

  function updateQuantityRow(
    collection: "materialRows" | "equipmentRows",
    rowId: string,
    patch: Partial<Omit<DailyReportQuantityRow, "id">>
  ) {
    onChange(
      applyDailyReportTotals(
        {
          ...report,
          [collection]: report[collection].map((row) =>
            row.id === rowId ? { ...row, ...patch } : row
          )
        },
        previousReport
      )
    );
  }

  function addWorkItem() {
    onChange({
      ...report,
      workItems: [
        ...report.workItems,
        {
          id: crypto.randomUUID(),
          trade: "",
          today: "",
          tomorrow: ""
        }
      ]
    });
  }

  function removeWorkItem(itemId: string) {
    onChange({
      ...report,
      workItems: report.workItems.filter((item) => item.id !== itemId)
    });
  }

  function addLaborRow(collection: "contractorLaborRows" | "subcontractorLaborRows") {
    onChange(
      applyDailyReportTotals(
        {
          ...report,
          [collection]: [
            ...report[collection],
            {
              id: crypto.randomUUID(),
              subcontractorName: "",
              trade: "",
              role: "",
              previous: "",
              today: "0",
              total: ""
            }
          ]
        },
        previousReport
      )
    );
  }

  function removeLaborRow(
    collection: "contractorLaborRows" | "subcontractorLaborRows",
    rowId: string
  ) {
    onChange({
      ...report,
      [collection]: report[collection].filter((row) => row.id !== rowId)
    });
  }

  function addQuantityRow(collection: "materialRows" | "equipmentRows") {
    onChange(
      applyDailyReportTotals(
        {
          ...report,
          [collection]: [
            ...report[collection],
            {
              id: crypto.randomUUID(),
              trade: "",
              name: "",
              spec: "",
              previous: "",
              today: "0",
              total: ""
            }
          ]
        },
        previousReport
      )
    );
  }

  function removeQuantityRow(
    collection: "materialRows" | "equipmentRows",
    rowId: string
  ) {
    onChange({
      ...report,
      [collection]: report[collection].filter((row) => row.id !== rowId)
    });
  }

  return (
    <article className="mx-auto max-w-4xl rounded-[8px] border border-[#d9d9d9] bg-white p-6 text-[#171717] shadow-sm">
      <header className="border-b border-[#171717] pb-4 text-center">
        <h4 className="text-2xl font-semibold tracking-[-0.03em]">공사일보</h4>
        <p className="mt-2 text-sm text-[#4d4d4d]">
          {formatKoreanDate(report.reportDate)}
        </p>
      </header>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <DocumentField
          inputType="date"
          isEditing={isEditing}
          label="작성일"
          value={report.reportDate}
          onChange={(value) => updateReport({ reportDate: value })}
        />
        <DocumentField
          isEditing={isEditing}
          label="현장대리인"
          value={report.siteManager}
          onChange={(value) => updateReport({ siteManager: value })}
        />
        <DocumentField
          isEditing={isEditing}
          label="날씨"
          value={report.weather}
          onChange={(value) => updateReport({ weather: value })}
        />
        <DocumentField
          isEditing={isEditing}
          label="최저기온"
          value={report.lowTemp}
          onChange={(value) => updateReport({ lowTemp: value })}
        />
        <DocumentField
          isEditing={isEditing}
          label="최고기온"
          value={report.highTemp}
          onChange={(value) => updateReport({ highTemp: value })}
        />
      </div>

      <DocumentPreviewSection title="작업내용">
        {isEditing ? (
          <DocumentWorkItemsEditor
            rows={report.workItems}
            onAddRow={addWorkItem}
            onChange={updateWorkItem}
            onRemoveRow={removeWorkItem}
          />
        ) : (
          <DocumentSimpleTable
            headers={["공종", "금일 작업", "명일 예정"]}
            rows={report.workItems
              .filter((item) => item.today.trim() || item.tomorrow.trim())
              .map((item) => [item.trade, item.today || "-", item.tomorrow || "-"])}
            emptyText="작성된 작업내용이 없습니다."
          />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="시공사">
        {isEditing ? (
          <DocumentLaborRowsEditor
            rows={contractorLabor}
            showSubcontractor={false}
            subcontractorOptions={subcontractorOptions}
            onAddRow={() => addLaborRow("contractorLaborRows")}
            onChange={(rowId, patch) =>
              updateLaborRow("contractorLaborRows", rowId, patch)
            }
            onRemoveRow={(rowId) =>
              removeLaborRow("contractorLaborRows", rowId)
            }
          />
        ) : (
          <DocumentSimpleTable
            headers={["공종", "직종", "전일", "금일", "누계"]}
            rows={contractorLabor.map((row) => [
              row.trade,
              row.role,
              row.previous || "0",
              row.today || "0",
              row.total || "0"
            ])}
            emptyText="작성된 시공사 현황이 없습니다."
          />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="협력사">
        {isEditing ? (
          <DocumentLaborRowsEditor
            rows={subcontractorLabor}
            showSubcontractor
            subcontractorOptions={subcontractorOptions}
            onAddRow={() => addLaborRow("subcontractorLaborRows")}
            onChange={(rowId, patch) =>
              updateLaborRow("subcontractorLaborRows", rowId, patch)
            }
            onRemoveRow={(rowId) =>
              removeLaborRow("subcontractorLaborRows", rowId)
            }
          />
        ) : (
          <DocumentSimpleTable
            headers={["협력사명", "공종", "직종", "전일", "금일", "누계"]}
            rows={subcontractorLabor.map((row) => [
              row.subcontractorName || "-",
              row.trade,
              row.role,
              row.previous || "0",
              row.today || "0",
              row.total || "0"
            ])}
            emptyText="작성된 협력사 작업자 현황이 없습니다."
          />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="자재 입고현황">
        {isEditing ? (
          <DocumentQuantityRowsEditor
            groupRows
            rows={materialRows}
            onAddRow={() => addQuantityRow("materialRows")}
            onChange={(rowId, patch) =>
              updateQuantityRow("materialRows", rowId, patch)
            }
            onRemoveRow={(rowId) => removeQuantityRow("materialRows", rowId)}
          />
        ) : (
          <DocumentSimpleTable
            headers={["공종", "자재명", "규격", "전일", "금일", "누계"]}
            rows={createGroupedQuantityDisplayRows(materialRows)}
            emptyText="작성된 자재 입고현황이 없습니다."
          />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="장비 현황">
        {isEditing ? (
          <DocumentQuantityRowsEditor
            rows={equipmentRows}
            onAddRow={() => addQuantityRow("equipmentRows")}
            onChange={(rowId, patch) =>
              updateQuantityRow("equipmentRows", rowId, patch)
            }
            onRemoveRow={(rowId) => removeQuantityRow("equipmentRows", rowId)}
          />
        ) : (
          <DocumentSimpleTable
            headers={["공종", "장비명", "규격", "전일", "금일", "누계"]}
            rows={equipmentRows.map((row) => [
              row.trade,
              row.name,
              row.spec || "-",
              row.previous || "0",
              row.today || "0",
              row.total || "0"
            ])}
            emptyText="작성된 장비 현황이 없습니다."
          />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="현장사진">
        {isEditing ? (
          <DailyReportPhotosEditor
            photos={report.photos}
            onChange={(photos) => updateReport({ photos })}
          />
        ) : (
          <DailyReportPhotosPreview photos={report.photos} />
        )}
      </DocumentPreviewSection>

      <DocumentPreviewSection title="특기사항">
        {isEditing ? (
          <textarea
            value={report.notes}
            onChange={(event) => updateReport({ notes: event.target.value })}
            className={`w-full ${textareaClass}`}
            placeholder="특기사항 입력"
          />
        ) : (
          <div className="min-h-20 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] p-3 text-sm leading-6 text-[#4d4d4d]">
            {report.notes.trim() || "작성된 특기사항이 없습니다."}
          </div>
        )}
      </DocumentPreviewSection>
    </article>
  );
}

function DailyReportPhotosEditor({
  onChange,
  photos
}: {
  onChange: (photos: DailyReportPhoto[]) => void;
  photos: DailyReportPhoto[];
}) {
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );

    event.target.value = "";

    if (files.length === 0 || isProcessingPhotos) {
      return;
    }

    setIsProcessingPhotos(true);

    try {
      const nextPhotos = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          fileName: file.name,
          dataUrl: await resizeDailyReportPhoto(file),
          caption: "",
          createdAt: new Date().toISOString()
        }))
      );

      onChange([...photos, ...nextPhotos]);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "사진을 첨부하지 못했습니다."
      );
    } finally {
      setIsProcessingPhotos(false);
    }
  }

  function updatePhoto(photoId: string, caption: string) {
    onChange(
      photos.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              caption
            }
          : photo
      )
    );
  }

  function removePhoto(photoId: string) {
    onChange(photos.filter((photo) => photo.id !== photoId));
  }

  return (
    <div className="rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#4d4d4d]">
          첨부된 사진 {photos.length}장
        </p>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]">
          <ImageIcon size={15} aria-hidden />
          {isProcessingPhotos ? "처리 중" : "사진 첨부"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={isProcessingPhotos}
            onChange={(event) => void addPhotos(event)}
          />
        </label>
      </div>

      {photos.length > 0 ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white"
            >
              <div className="aspect-[4/3] bg-[#f2f2f2]">
                {/* User-uploaded data URLs are previewed directly instead of using Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || photo.fileName}
                  className="size-full object-cover"
                />
              </div>
              <div className="space-y-2 p-3">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(event) => updatePhoto(photo.id, event.target.value)}
                  placeholder="사진 설명 입력"
                  className={`w-full ${inputClass}`}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-[#8f8f8f]">
                    {photo.fileName}
                  </p>
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                    aria-label={`${photo.fileName} 사진 삭제`}
                    onClick={() => removePhoto(photo.id)}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-[8px] border border-dashed border-[#dedede] bg-white p-6 text-center text-sm text-[#8f8f8f]">
          첨부된 현장사진이 없습니다.
        </div>
      )}
    </div>
  );
}

function DailyReportPhotosPreview({ photos }: { photos: DailyReportPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] p-4 text-center text-sm text-[#8f8f8f]">
        첨부된 현장사진이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {photos.map((photo, index) => (
        <figure
          key={photo.id}
          className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white"
        >
          <div className="aspect-[4/3] bg-[#f2f2f2]">
            {/* User-uploaded data URLs are previewed directly instead of using Next image optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt={photo.caption || `${index + 1}번 현장사진`}
              className="size-full object-cover"
            />
          </div>
          <figcaption className="border-t border-[#ebebeb] px-3 py-2 text-sm text-[#4d4d4d]">
            {photo.caption || photo.fileName || `현장사진 ${index + 1}`}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function DocumentField({
  inputType = "text",
  isEditing = false,
  label,
  onChange,
  value
}: {
  inputType?: "date" | "text";
  isEditing?: boolean;
  label: string;
  onChange?: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-[6px] border border-[#ebebeb]">
      <div className="bg-[#fcfcfc] px-3 py-2 font-medium text-[#4d4d4d]">
        {label}
      </div>
      <div className="px-3 py-2">
        {isEditing && onChange ? (
          <input
            type={inputType}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-full rounded-[4px] border border-[#ebebeb] bg-white px-2 text-sm outline-none transition focus:border-[#171717]"
          />
        ) : (
          value || "-"
        )}
      </div>
    </div>
  );
}

function DocumentWorkItemsEditor({
  onChange,
  onAddRow,
  onRemoveRow,
  rows
}: {
  onAddRow: () => void;
  onChange: (
    itemId: string,
    patch: Partial<Pick<DailyReportWorkItem, "trade" | "today" | "tomorrow">>
  ) => void;
  onRemoveRow: (itemId: string) => void;
  rows: DailyReportWorkItem[];
}) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-xs font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
          onClick={onAddRow}
        >
          <Plus size={14} aria-hidden />
          항목 추가
        </button>
      </div>
      <div className="overflow-x-auto rounded-[6px] border border-[#ebebeb]">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fcfcfc]">
            {["공종", "금일 작업", "명일 예정", ""].map((header) => (
              <DocumentEditableHeader key={header}>{header}</DocumentEditableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <DocumentEditableCell
                value={row.trade}
                onChange={(value) => onChange(row.id, { trade: value })}
              />
              <DocumentEditableCell
                value={row.today}
                onChange={(value) => onChange(row.id, { today: value })}
              />
              <DocumentEditableCell
                value={row.tomorrow}
                onChange={(value) => onChange(row.id, { tomorrow: value })}
              />
              <td className="border-b border-[#f2f2f2] px-2 py-2">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-[4px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  aria-label={`${row.trade || "작업내용"} 삭제`}
                  onClick={() => onRemoveRow(row.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function DocumentLaborRowsEditor({
  onChange,
  onAddRow,
  onRemoveRow,
  showSubcontractor,
  subcontractorOptions,
  rows
}: {
  onAddRow: () => void;
  onChange: (rowId: string, patch: Partial<Omit<DailyReportLaborRow, "id">>) => void;
  onRemoveRow: (rowId: string) => void;
  showSubcontractor: boolean;
  subcontractorOptions: string[];
  rows: DailyReportLaborRow[];
}) {
  const headers = showSubcontractor
    ? ["협력사명", "공종", "직종", "전일", "금일", "누계", ""]
    : ["공종", "직종", "전일", "금일", "누계", ""];

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-xs font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
          onClick={onAddRow}
        >
          <Plus size={14} aria-hidden />
          항목 추가
        </button>
      </div>
      <div className="overflow-x-auto rounded-[6px] border border-[#ebebeb]">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fcfcfc]">
            {headers.map((header) => (
              <DocumentEditableHeader key={header}>{header}</DocumentEditableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {showSubcontractor ? (
                <td className="border-b border-[#f2f2f2] px-2 py-2">
                  <select
                    value={row.subcontractorName ?? ""}
                    onChange={(event) =>
                      onChange(row.id, { subcontractorName: event.target.value })
                    }
                    className="h-8 w-full rounded-[4px] border border-[#ebebeb] bg-white px-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  >
                    <option value="">협력사 선택</option>
                    {subcontractorOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
              <DocumentEditableCell
                value={row.trade}
                onChange={(value) => onChange(row.id, { trade: value })}
              />
              <DocumentEditableCell
                value={row.role}
                onChange={(value) => onChange(row.id, { role: value })}
              />
              <DocumentEditableCell
                value={row.previous}
                readOnly
                onChange={() => undefined}
              />
              <DocumentEditableCell
                value={row.today}
                selectOnFocus
                onChange={(value) => onChange(row.id, { today: value })}
              />
              <DocumentEditableCell
                value={row.total}
                readOnly
                onChange={() => undefined}
              />
              <td className="border-b border-[#f2f2f2] px-2 py-2">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-[4px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  aria-label={`${row.trade || "인원"} 삭제`}
                  onClick={() => onRemoveRow(row.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function DocumentQuantityRowsEditor({
  groupRows = false,
  onChange,
  onAddRow,
  onRemoveRow,
  rows
}: {
  groupRows?: boolean;
  onAddRow: () => void;
  onChange: (
    rowId: string,
    patch: Partial<Omit<DailyReportQuantityRow, "id">>
  ) => void;
  onRemoveRow: (rowId: string) => void;
  rows: DailyReportQuantityRow[];
}) {
  const displayRows = groupRows ? groupDailyReportQuantityRows(rows) : rows;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-xs font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
          onClick={onAddRow}
        >
          <Plus size={14} aria-hidden />
          항목 추가
        </button>
      </div>
      <div className="overflow-x-auto rounded-[6px] border border-[#ebebeb]">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fcfcfc]">
            {["공종", "명칭", "규격", "전일", "금일", "누계", ""].map((header) => (
              <DocumentEditableHeader key={header}>{header}</DocumentEditableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => (
            <tr key={row.id}>
              <DocumentEditableCell
                value={row.trade}
                onChange={(value) => onChange(row.id, { trade: value })}
              />
              <DocumentEditableCell
                value={row.name}
                onChange={(value) => onChange(row.id, { name: value })}
              />
              <DocumentEditableCell
                value={row.spec}
                onChange={(value) => onChange(row.id, { spec: value })}
              />
              <DocumentEditableCell
                value={row.previous}
                readOnly
                onChange={() => undefined}
              />
              <DocumentEditableCell
                value={row.today}
                selectOnFocus
                onChange={(value) => onChange(row.id, { today: value })}
              />
              <DocumentEditableCell
                value={row.total}
                readOnly
                onChange={() => undefined}
              />
              <td className="border-b border-[#f2f2f2] px-2 py-2">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-[4px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  aria-label={`${row.name || "항목"} 삭제`}
                  onClick={() => onRemoveRow(row.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function DocumentEditableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-[#ebebeb] px-2 py-2 text-left font-medium text-[#4d4d4d]">
      {children}
    </th>
  );
}

function DocumentEditableCell({
  onChange,
  readOnly = false,
  selectOnFocus = false,
  value
}: {
  onChange: (value: string) => void;
  readOnly?: boolean;
  selectOnFocus?: boolean;
  value: string;
}) {
  return (
    <td className="border-b border-[#f2f2f2] px-2 py-2">
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          if (selectOnFocus && !readOnly) {
            event.currentTarget.select();
          }
        }}
        onMouseUp={(event) => {
          if (selectOnFocus && !readOnly) {
            event.preventDefault();
          }
        }}
        className={`h-8 w-full rounded-[4px] border border-[#ebebeb] px-2 text-sm outline-none transition focus:border-[#171717] ${
          readOnly
            ? "bg-[#fcfcfc] font-semibold text-[#4d4d4d]"
            : "bg-white text-[#171717]"
        }`}
      />
    </td>
  );
}

function DocumentPreviewSection({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="mt-6">
      <h5 className="mb-2 text-sm font-semibold text-[#171717]">{title}</h5>
      {children}
    </section>
  );
}

function DocumentSimpleTable({
  emptyText,
  headers,
  rows
}: {
  emptyText: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-[#ebebeb] bg-[#fcfcfc] px-4 py-5 text-center text-sm text-[#8f8f8f]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[#ebebeb]">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-[#fcfcfc]">
            {headers.map((header) => (
              <th
                key={header}
                className="border-b border-[#ebebeb] px-3 py-2 text-left font-medium text-[#4d4d4d]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className="border-b border-[#f2f2f2] px-3 py-2 text-[#171717] last:border-r-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasAnyDailyReportRowValue(
  row: DailyReportLaborRow | DailyReportQuantityRow
) {
  if ("role" in row) {
    return Boolean(
      row.subcontractorName?.trim() ||
        row.trade.trim() ||
        row.role.trim() ||
        row.previous.trim() ||
        row.today.trim() ||
        row.total.trim()
    );
  }

  return Boolean(row.spec.trim() || row.previous.trim() || row.today.trim() || row.total.trim());
}

function hasDailyReportDocumentContent(report: ConstructionDailyReport) {
  return Boolean(
    report.notes.trim() ||
      report.lowTemp.trim() ||
      report.highTemp.trim() ||
      report.workItems.some(
        (item) => item.today.trim() || item.tomorrow.trim()
      ) ||
      report.contractorLaborRows.some(hasAnyDailyReportRowValue) ||
      report.subcontractorLaborRows.some(hasAnyDailyReportRowValue) ||
      report.materialRows.some(hasAnyDailyReportRowValue) ||
      report.equipmentRows.some(hasAnyDailyReportRowValue) ||
      report.photos.length > 0
  );
}

function ProjectComingSoonPage({
  page,
  project
}: {
  page: ProjectComingSoonPageKey;
  project: WorkspaceProject;
}) {
  const projectMembers = getProjectInvitedMemberSummaries(project);
  const sectionMap = {
    schedule: {
      icon: ChartNoAxesGantt,
      title: "공정관리",
      description:
        "공종별 일정, 진행률, 작업 계획을 3D 객체와 연결하기 위한 영역입니다.",
      meta: "공정표 연동 기능 준비 중"
    },
    "progress-payments": {
      icon: ClipboardList,
      title: "기성관리",
      description:
        "협력사별 기성 청구, 검수, 지급 상태와 관련 서류를 관리하기 위한 영역입니다.",
      meta: "기성 청구 및 지급 관리 기능 준비 중"
    },
    photos: {
      icon: ImageIcon,
      title: "사진첩",
      description:
        "날짜별 현장 사진과 작업 위치 이미지를 프로젝트 안에서 정리할 영역입니다.",
      meta: "사진 업로드 기능 준비 중"
    },
    members: {
      icon: Users,
      title: "팀원",
      description:
        "프로젝트 참여자와 협력사 담당자를 확인하고 권한을 관리할 영역입니다.",
      meta: `${projectMembers.length}명 참여 중`
    }
  } satisfies Record<
    ProjectComingSoonPageKey,
    {
      icon: typeof FileText;
      title: string;
      description: string;
      meta: string;
    }
  >;
  const section = sectionMap[page];
  const Icon = section.icon;

  return (
    <section className="rounded-[8px] border border-[#ebebeb] bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] text-[#8f8f8f]">
          <Icon size={19} aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            {section.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d4d4d]">
            {section.description}
          </p>
          <p className="mt-5 text-xs font-medium text-[#8f8f8f]">
            {section.meta}
          </p>
        </div>
      </div>
    </section>
  );
}

function DailyReportSection({
  documents,
  onCreateProjectDocument,
  onOpenDocumentTab,
  onOpenProjectDocument,
  onReportsChange,
  project,
  refreshKey = 0
}: {
  documents?: StoredProjectDocument[];
  onCreateProjectDocument?: (
    documentType: Exclude<ProjectDocumentTabKey, "daily-report">,
    documentDate: string,
    inspectionTemplateKey?: InspectionRequestTemplateKey
  ) => void;
  onOpenDocumentTab?: (tabKey: ProjectDocumentTabKey) => void;
  onOpenProjectDocument?: (document: ProjectDocumentListItem) => void;
  onReportsChange?: () => void;
  project: WorkspaceProject;
  refreshKey?: number;
}) {
  const [reports, setReports] = useState<ConstructionDailyReport[]>([]);
  const [projectSubcontractorNames, setProjectSubcontractorNames] = useState<
    string[]
  >([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [isDocumentMenuOpen, setIsDocumentMenuOpen] = useState(false);
  const [isInspectionTemplateMenuOpen, setIsInspectionTemplateMenuOpen] =
    useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getTodayInputValue().slice(0, 7)
  );
  const selectedReport =
    reports.find((report) => report.reportDate === selectedDate) ?? null;
  const selectedDateDocuments: ProjectDocumentListItem[] = [
    ...(selectedReport ? [createDailyReportDocument(selectedReport)] : []),
    ...(documents ?? []).filter((document) => document.date === selectedDate)
  ];
  const editingReport =
    reports.find((report) => report.id === editingReportId) ?? null;
  const monthStart = new Date(`${calendarMonth}-01T00:00:00`);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const dateValue = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 10);

    const dailyReportDocument = reports.find(
      (report) => report.reportDate === dateValue
    );
    const storedDocuments = (documents ?? []).filter(
      (document) => document.date === dateValue
    );
    const dayDocuments: ProjectDocumentListItem[] = [
      ...(dailyReportDocument
        ? [createDailyReportDocument(dailyReportDocument)]
        : []),
      ...storedDocuments
    ];

    return {
      date,
      dateValue,
      documents: dayDocuments,
      isCurrentMonth: dateValue.slice(0, 7) === calendarMonth,
      report: dailyReportDocument ?? null
    };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedReports = getProjectDailyReports(project.id);
      setProjectSubcontractorNames(getProjectSubcontractorNames(project.id));
      setReports(storedReports);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [project.id, refreshKey]);

  function replaceProjectReports(
    nextProjectReports: ConstructionDailyReport[],
    schemas: DailyReportSyncSchemas = {}
  ) {
    const otherReports = readDailyReports().filter(
      (report) => report.projectId !== project.id
    );
    const sortedProjectReports = syncProjectDailyReports(nextProjectReports, schemas);

    storeDailyReports([...otherReports, ...sortedProjectReports]);
    setReports(sortedProjectReports);
    onReportsChange?.();
  }

  function moveCalendarMonth(offset: number) {
    const currentMonth = new Date(`${calendarMonth}-01T00:00:00`);
    currentMonth.setMonth(currentMonth.getMonth() + offset);
    const nextMonth = new Date(
      currentMonth.getTime() - currentMonth.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 7);

    setCalendarMonth(nextMonth);
  }

  function selectCalendarDate(reportDate: string) {
    setSelectedDate(reportDate);
    setIsDocumentMenuOpen(false);
    setIsInspectionTemplateMenuOpen(false);

    if (reportDate.slice(0, 7) !== calendarMonth) {
      setCalendarMonth(reportDate.slice(0, 7));
    }
  }

  function openDailyReportForSelectedDate() {
    const existingReport = reports.find(
      (report) => report.reportDate === selectedDate
    );

    if (existingReport) {
      const normalizedReport = applyDailyReportTotals(
        existingReport,
        getPreviousDailyReport(reports, existingReport)
      );
      replaceProjectReports(
        reports.map((report) =>
          report.id === existingReport.id ? normalizedReport : report
        )
      );
      setEditingReportId(existingReport.id);
      setIsDocumentMenuOpen(false);
      setIsInspectionTemplateMenuOpen(false);
      return;
    }

    const sourceReport = getLatestDailyReportSchemaSource(reports);
    const defaultReport = createDefaultDailyReport(
      project,
      selectedDate,
      sourceReport
    );
    const nextReport = applyDailyReportTotals(
      defaultReport,
      getPreviousDailyReport(reports, defaultReport)
    );
    replaceProjectReports([nextReport, ...reports], {
      contractorLaborRows: nextReport.contractorLaborRows,
      subcontractorLaborRows: nextReport.subcontractorLaborRows,
      equipmentRows: nextReport.equipmentRows,
      materialRows: nextReport.materialRows
    });
    setEditingReportId(nextReport.id);
    setIsDocumentMenuOpen(false);
    setIsInspectionTemplateMenuOpen(false);
  }

  function updateSelectedReport(
    patch: Partial<
      Pick<
        ConstructionDailyReport,
        | "reportDate"
        | "weather"
        | "lowTemp"
        | "highTemp"
        | "siteManager"
        | "notes"
        | "photos"
      >
    >
  ) {
    const activeReportId = editingReportId ?? selectedReport?.id;

    if (!activeReportId) {
      return;
    }

    if (patch.reportDate) {
      setSelectedDate(patch.reportDate);
      setCalendarMonth(patch.reportDate.slice(0, 7));
    }

    replaceProjectReports(
      reports.map((report) =>
        report.id === activeReportId
          ? {
              ...applyDailyReportTotals(
                {
                  ...report,
                  ...patch
                },
                getPreviousDailyReport(reports, {
                  ...report,
                  ...patch
                })
              ),
              updatedAt: new Date().toISOString()
            }
          : report
      )
    );
  }

  function replaceDailyReport(nextReport: ConstructionDailyReport) {
    if (nextReport.reportDate) {
      setSelectedDate(nextReport.reportDate);
      setCalendarMonth(nextReport.reportDate.slice(0, 7));
    }

    const normalizedReport = applyDailyReportTotals(
      nextReport,
      getPreviousDailyReport(reports, nextReport)
    );
    const updatedReport = {
      ...normalizedReport,
      updatedAt: new Date().toISOString()
    };
    const nextReports = reports.map((report) =>
      report.id === updatedReport.id ? updatedReport : report
    );

    replaceProjectReports(nextReports, {
      contractorLaborRows: updatedReport.contractorLaborRows,
      subcontractorLaborRows: updatedReport.subcontractorLaborRows,
      equipmentRows: updatedReport.equipmentRows,
      materialRows: updatedReport.materialRows
    });
  }

  return (
    <section id="project-calendar" className="mt-8 scroll-mt-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="rounded-[8px] border border-[#ebebeb] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => moveCalendarMonth(-1)}
            >
              이전
            </button>
            <div className="text-center">
              <p className="text-lg font-semibold">{calendarMonth}</p>
              <p className="text-xs text-[#8f8f8f]">
                {reports.length + (documents?.length ?? 0)}개 문서
              </p>
            </div>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => moveCalendarMonth(1)}
            >
              다음
            </button>
          </div>

          <div className="grid grid-cols-7 border-y border-[#ebebeb] bg-[#fcfcfc] text-center text-xs font-semibold text-[#4d4d4d]">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-[#ebebeb]">
            {calendarDays.map((day) => {
              const isSelected = selectedDate === day.dateValue;

              return (
                <button
                  key={day.dateValue}
                  type="button"
                  className={`min-h-[128px] border-b border-r border-[#ebebeb] p-2 text-left transition ${
                    isSelected
                      ? "bg-[#f6f6f6] ring-1 ring-inset ring-[#171717]"
                      : "bg-white hover:bg-[#fcfcfc]"
                  } ${day.isCurrentMonth ? "" : "text-[#c0c0c0]"}`}
                  onClick={() => selectCalendarDate(day.dateValue)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {day.date.getDate()}
                    </span>
                    {day.documents.length > 0 ? (
                      <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[10px] font-medium text-white">
                        문서
                      </span>
                    ) : null}
                  </div>
                  {day.documents.length > 0 ? (
                    <div className="mt-2 grid gap-0.5">
                      {day.documents.map((document) => (
                        <p
                          key={document.id}
                          className="truncate text-[10px] font-semibold leading-4 text-[#171717]"
                          title={getCalendarDocumentTitle(document)}
                        >
                          {getCalendarDocumentTitle(document)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="sr-only">문서 없음</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[#ebebeb] bg-white p-5">
          <div className="relative mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays size={17} aria-hidden />
              <h4 className="truncate text-base font-semibold">
                {formatKoreanDate(selectedDate)}
              </h4>
            </div>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white text-[#171717] transition hover:bg-[#f6f6f6]"
              aria-label={`${formatKoreanDate(selectedDate)} 문서 추가`}
              onClick={() => {
                setIsDocumentMenuOpen((value) => {
                  const nextValue = !value;

                  if (!nextValue) {
                    setIsInspectionTemplateMenuOpen(false);
                  }

                  return nextValue;
                });
              }}
            >
              <Plus size={17} aria-hidden />
            </button>
            {isDocumentMenuOpen ? (
              <div className="absolute right-0 top-11 z-10 w-60 overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                {isInspectionTemplateMenuOpen
                  ? inspectionRequestTemplates.map((template) => (
                      <button
                        key={template.key}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
                        onClick={() => {
                          setIsInspectionTemplateMenuOpen(false);
                          setIsDocumentMenuOpen(false);
                          onCreateProjectDocument?.(
                            "inspection-request",
                            selectedDate,
                            template.key
                          );
                        }}
                      >
                        {template.label}
                      </button>
                    ))
                  : projectDocumentTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
                        onClick={() => {
                          if (tab.key === "daily-report") {
                            openDailyReportForSelectedDate();
                            return;
                          }

                          if (tab.key === "inspection-request") {
                            setIsInspectionTemplateMenuOpen(true);
                            return;
                          }

                          setIsDocumentMenuOpen(false);
                          setIsInspectionTemplateMenuOpen(false);
                          onCreateProjectDocument?.(tab.key, selectedDate);
                          onOpenDocumentTab?.(tab.key);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
              </div>
            ) : null}
          </div>

          {selectedDateDocuments.length > 0 ? (
            <div className="grid gap-2">
              {selectedDateDocuments.map((document) => {
                const isDailyReport = document.documentType === "daily-report";
                const report = document.report;

                return (
                  <button
                    key={document.id}
                    type="button"
                    className="w-full rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-4 text-left transition hover:border-[#171717] hover:bg-white"
                    onClick={() => {
                      if (isDailyReport && report) {
                        setEditingReportId(report.id);
                        return;
                      }

                      onOpenProjectDocument?.(document);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#171717]">
                          {getCalendarDocumentTitle(document)}
                        </p>
                        <p className="mt-1 text-xs text-[#8f8f8f]">
                          문서를 클릭해서 {isDailyReport ? "작성" : "확인"}
                        </p>
                      </div>
                      <ClipboardList
                        size={18}
                        className="shrink-0 text-[#8f8f8f]"
                        aria-hidden
                      />
                    </div>
                    {isDailyReport && report ? (
                      <>
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#4d4d4d]">
                          <CloudSun size={14} aria-hidden />
                          {report.weather || "날씨 미입력"}
                          {report.lowTemp || report.highTemp
                            ? ` · ${report.lowTemp || "-"} / ${
                                report.highTemp || "-"
                              }℃`
                            : ""}
                        </div>
                        <p className="mt-2 text-xs text-[#8f8f8f]">
                          금일 작업{" "}
                          {report.workItems.filter((item) => item.today).length}건
                        </p>
                      </>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#4d4d4d]">
                        <span>{document.owner || "관리자"}</span>
                        <span className="text-[#c0c0c0]">·</span>
                        <span>{document.status || "작성됨"}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="rounded-[8px] border border-dashed border-[#ebebeb] p-5 text-center text-sm text-[#8f8f8f]">
                아직 생성된 문서가 없습니다.
                <br />
                오른쪽 위 + 버튼에서 문서를 추가하세요.
              </div>
            </>
          )}
        </aside>
      </div>

      {editingReport ? (
        <DailyReportEditorDialog
          project={project}
          report={editingReport}
          subcontractorOptions={projectSubcontractorNames}
          onClose={() => setEditingReportId(null)}
          onChangeReport={replaceDailyReport}
          onUpdateReport={updateSelectedReport}
        />
      ) : null}
    </section>
  );
}

function ProjectScheduleSection({ project }: { project: WorkspaceProject }) {
  const [items, setItems] = useState<ProjectScheduleItem[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getTodayInputValue().slice(0, 7)
  );
  const [isImportingSchedule, setIsImportingSchedule] = useState(false);
  const [isExportingSchedule, setIsExportingSchedule] = useState(false);
  const [scheduleImportMessage, setScheduleImportMessage] = useState("");
  const [isScheduleListOpen, setIsScheduleListOpen] = useState(false);
  const [isScheduleCalendarOpen, setIsScheduleCalendarOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() =>
    getTodayInputValue()
  );
  const [schedulePickerMonth, setSchedulePickerMonth] = useState(() =>
    getTodayInputValue().slice(0, 7)
  );
  const [draft, setDraft] = useState({
    id: "",
    title: "",
    category: "공정",
    startDate: getTodayInputValue(),
    endDate: getTodayInputValue(),
    progress: 0,
    notes: ""
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getProjectSchedules(project.id));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [project.id]);

  function persist(nextItems: ProjectScheduleItem[]) {
    const otherItems = readProjectSchedules().filter(
      (item) => item.projectId !== project.id
    );
    const sorted = [...nextItems].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );

    storeProjectSchedules([...otherItems, ...sorted]);
    setItems(sorted);
  }

  async function importScheduleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImportingSchedule(true);
    setScheduleImportMessage("공정표 엑셀을 읽는 중입니다.");

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true
      });
      const extractionResults = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          return {
            items: [] as ImportedScheduleItem[],
            score: 0,
            sheetName
          };
        }

        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          raw: true,
          blankrows: false,
          defval: null
        });
        const explicitItems = extractExplicitScheduleItemsFromRows(
          rows,
          sheetName
        );
        const scheduleHeader = findScheduleDateHeader(rows);
        const weeklyItems =
          explicitItems.length > 0
            ? []
            : extractScheduleItemsFromRows(rows, sheetName);

        return {
          items: explicitItems.length > 0 ? explicitItems : weeklyItems,
          score:
            explicitItems.length > 0
              ? explicitItems.length + 10_000
              : (scheduleHeader?.score ?? 0),
          sheetName
        };
      }).sort((left, right) => right.score - left.score);
      const bestExtraction = extractionResults[0];
      const importedItems = bestExtraction?.items ?? [];

      if (importedItems.length === 0) {
        setScheduleImportMessage(
          "인식 가능한 날짜 헤더와 공정 행을 찾지 못했습니다."
        );
        return;
      }

      const now = new Date().toISOString();
      const existingExactKeys = new Set(
        items.map(
          (item) =>
            `${item.title}|${item.category}|${item.startDate}|${item.endDate}`
        )
      );
      const existingLooseIndexes = new Map(
        items.map((item, index) => [
          `${item.title}|${item.startDate}|${item.endDate}`,
          index
        ])
      );
      const mergedItems = [...items];
      const nextImportedItems: ProjectScheduleItem[] = [];
      let updatedExistingCount = 0;

      importedItems.forEach((item) => {
        const endDate = item.endDate < item.startDate ? item.startDate : item.endDate;
        const exactKey = `${item.title}|${item.category}|${item.startDate}|${endDate}`;
        const looseKey = `${item.title}|${item.startDate}|${endDate}`;

        if (existingExactKeys.has(exactKey)) {
          return;
        }

        const existingIndex = existingLooseIndexes.get(looseKey);

        if (existingIndex !== undefined) {
          const existingItem = mergedItems[existingIndex];
          const nextCategory = item.category || existingItem.category || "공정";

          if (existingItem.category !== nextCategory) {
            mergedItems[existingIndex] = {
              ...existingItem,
              category: nextCategory,
              notes: item.notes || existingItem.notes,
              updatedAt: now
            };
            updatedExistingCount += 1;
          }

          existingExactKeys.add(exactKey);
          return;
        }

        existingExactKeys.add(exactKey);
        existingLooseIndexes.set(looseKey, mergedItems.length + nextImportedItems.length);
        nextImportedItems.push({
          id: crypto.randomUUID(),
          projectId: project.id,
          title: item.title,
          category: item.category || "공정",
          startDate: item.startDate,
          endDate,
          progress: calculateScheduleProgress(item.startDate, endDate),
          notes: item.notes,
          createdAt: now,
          updatedAt: now
        });
      });

      if (nextImportedItems.length === 0 && updatedExistingCount === 0) {
        setScheduleImportMessage(
          `${file.name}의 공정은 이미 현재 공정표에 반영되어 있습니다.`
        );
        return;
      }

      persist([...mergedItems, ...nextImportedItems]);
      setCalendarMonth(
        (nextImportedItems[0]?.startDate ?? importedItems[0].startDate).slice(0, 7)
      );
      setScheduleImportMessage(
        `${file.name}의 ${bestExtraction.sheetName} 시트에서 ${nextImportedItems.length}개 공정을 가져오고 ${updatedExistingCount}개 공정을 정리했습니다.`
      );
    } catch (error) {
      setScheduleImportMessage(
        error instanceof Error
          ? `공정표를 읽지 못했습니다: ${error.message}`
          : "공정표를 읽지 못했습니다."
      );
    } finally {
      setIsImportingSchedule(false);
    }
  }

  async function exportScheduleFile() {
    if (items.length === 0) {
      setScheduleImportMessage("내보낼 공정이 없습니다.");
      return;
    }

    setIsExportingSchedule(true);
    setScheduleImportMessage("공정표 엑셀을 만드는 중입니다.");

    try {
      const XLSX = await import("xlsx");
      const sortedItems = [...items].sort((left, right) =>
        left.startDate.localeCompare(right.startDate)
      );
      const rows = [
        [
          "No",
          "분류",
          "공정명",
          "시작일",
          "종료일",
          "기간(일)",
          "진행률(%)",
          "메모",
          "작성일",
          "수정일"
        ],
        ...sortedItems.map((item, index) => [
          index + 1,
          item.category,
          item.title,
          item.startDate,
          item.endDate,
          getInclusiveDayCount(item.startDate, item.endDate),
          calculateScheduleProgress(item.startDate, item.endDate),
          item.notes,
          item.createdAt.slice(0, 10),
          item.updatedAt.slice(0, 10)
        ])
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 32 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 36 },
        { wch: 12 },
        { wch: 12 }
      ];
      worksheet["!autofilter"] = {
        ref: `A1:J${rows.length}`
      };

      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Author: "BIM Workspace",
        CreatedDate: new Date(),
        Title: `${project.name} 공정표`
      };
      XLSX.utils.book_append_sheet(workbook, worksheet, "공정표");

      const output = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });
      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${sanitizeFileName(project.name)}_공정표_${getTodayInputValue()}.xlsx`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setScheduleImportMessage(`${fileName}로 ${sortedItems.length}개 공정을 내보냈습니다.`);
    } catch (error) {
      setScheduleImportMessage(
        error instanceof Error
          ? `공정표를 내보내지 못했습니다: ${error.message}`
          : "공정표를 내보내지 못했습니다."
      );
    } finally {
      setIsExportingSchedule(false);
    }
  }

  function getMonthDateRange(monthValue: string) {
    const start = new Date(`${monthValue}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);

    return {
      firstDate: new Date(start.getTime() - start.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 10),
      lastDate: new Date(end.getTime() - end.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 10)
    };
  }

  function getScheduleFocusMonth(startDate: string, endDate: string) {
    const displayedMonth = getMonthDateRange(calendarMonth);

    if (
      startDate <= displayedMonth.lastDate &&
      endDate >= displayedMonth.firstDate
    ) {
      return calendarMonth;
    }

    const today = getTodayInputValue();

    if (startDate <= today && today <= endDate) {
      return today.slice(0, 7);
    }

    return startDate.slice(0, 7);
  }

  function moveCalendarMonth(offset: number) {
    const currentMonth = new Date(`${calendarMonth}-01T00:00:00`);
    currentMonth.setMonth(currentMonth.getMonth() + offset);
    const nextMonth = new Date(
      currentMonth.getTime() - currentMonth.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 7);

    setCalendarMonth(nextMonth);
  }

  function moveSchedulePickerMonth(offset: number) {
    const currentMonth = new Date(`${schedulePickerMonth}-01T00:00:00`);
    currentMonth.setMonth(currentMonth.getMonth() + offset);
    const nextMonth = new Date(
      currentMonth.getTime() - currentMonth.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 7);

    setSchedulePickerMonth(nextMonth);
  }

  function selectScheduleCalendarDate(dateValue: string) {
    setSelectedScheduleDate(dateValue);
    setCalendarMonth(dateValue.slice(0, 7));
    setSchedulePickerMonth(dateValue.slice(0, 7));
    setIsScheduleCalendarOpen(false);
  }

  function resetDraft() {
    setDraft({
      id: "",
      title: "",
      category: "공정",
      startDate: getTodayInputValue(),
      endDate: getTodayInputValue(),
      progress: 0,
      notes: ""
    });
  }

  function saveDraft() {
    if (!draft.title.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const existing = draft.id ? items.find((item) => item.id === draft.id) : null;
    const endDate = draft.endDate < draft.startDate ? draft.startDate : draft.endDate;
    const nextItem: ProjectScheduleItem = {
      id: draft.id || crypto.randomUUID(),
      projectId: project.id,
      title: draft.title.trim(),
      category: draft.category.trim() || "공정",
      startDate: draft.startDate,
      endDate,
      progress: calculateScheduleProgress(draft.startDate, endDate),
      notes: draft.notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    persist(
      draft.id
        ? items.map((item) => (item.id === draft.id ? nextItem : item))
        : [nextItem, ...items]
    );
    setCalendarMonth(getScheduleFocusMonth(nextItem.startDate, nextItem.endDate));
    resetDraft();
  }

  function editItem(item: ProjectScheduleItem) {
    setDraft({
      id: item.id,
      title: item.title,
      category: item.category,
      startDate: item.startDate,
      endDate: item.endDate,
      progress: item.progress,
      notes: item.notes
    });
    setCalendarMonth(getScheduleFocusMonth(item.startDate, item.endDate));
  }

  function removeItem(itemId: string) {
    const item = items.find((scheduleItem) => scheduleItem.id === itemId);

    if (!item || !window.confirm(`${item.title} 공종을 삭제하시겠습니까?`)) {
      return;
    }

    persist(items.filter((item) => item.id !== itemId));
    if (draft.id === itemId) {
      resetDraft();
    }
  }

  function resetScheduleItems() {
    if (
      items.length === 0 ||
      !window.confirm("등록된 공종을 전체 초기화하시겠습니까?")
    ) {
      return;
    }

    persist([]);
    resetDraft();
  }

  const monthStart = new Date(`${calendarMonth}-01T00:00:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  const calendarDays = Array.from(
    { length: monthEnd.getDate() },
    (_, index) => {
      const date = new Date(monthStart);
      date.setDate(index + 1);
      return {
        day: index + 1,
        value: new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 10),
        weekday: date.getDay()
      };
    }
  );
  const firstDate = calendarDays[0].value;
  const lastDate = calendarDays[calendarDays.length - 1].value;
  const monthLabel = `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`;
  const visibleItems = items
    .filter(
      (item) =>
        item.startDate <= lastDate &&
        item.endDate >= firstDate &&
        !isScheduleSummaryItem(item)
    )
    .sort(compareScheduleItems);
  const scheduleListGroups = items
    .filter((item) => !isScheduleSummaryItem(item))
    .sort(compareScheduleItems)
    .reduce<Array<{ items: ProjectScheduleItem[]; majorCategory: string }>>(
      (groups, item) => {
        const majorCategory = getScheduleMajorCategory(item);
        const currentGroup = groups[groups.length - 1];

        if (!currentGroup || currentGroup.majorCategory !== majorCategory) {
          groups.push({ items: [item], majorCategory });
        } else {
          currentGroup.items.push(item);
        }

        return groups;
      },
      []
    );
  const schedulePickerMonthStart = new Date(`${schedulePickerMonth}-01T00:00:00`);
  const schedulePickerMonthEnd = new Date(schedulePickerMonthStart);
  schedulePickerMonthEnd.setMonth(schedulePickerMonthEnd.getMonth() + 1);
  schedulePickerMonthEnd.setDate(0);
  const schedulePickerDays = Array.from(
    { length: schedulePickerMonthEnd.getDate() },
    (_, index) => {
      const date = new Date(schedulePickerMonthStart);
      date.setDate(index + 1);

      return {
        day: index + 1,
        value: new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 10),
        weekday: date.getDay()
      };
    }
  );
  const schedulePickerYear = schedulePickerMonthStart.getFullYear();
  const schedulePickerMonthNumber = schedulePickerMonthStart.getMonth() + 1;
  const scheduleItemYears = items.flatMap((item) => [
    Number(item.startDate.slice(0, 4)),
    Number(item.endDate.slice(0, 4))
  ]);
  const schedulePickerYearStart = Math.min(
    schedulePickerYear - 5,
    ...scheduleItemYears.filter(Number.isFinite)
  );
  const schedulePickerYearEnd = Math.max(
    schedulePickerYear + 5,
    ...scheduleItemYears.filter(Number.isFinite)
  );
  const schedulePickerYears = Array.from(
    { length: schedulePickerYearEnd - schedulePickerYearStart + 1 },
    (_, index) => schedulePickerYearStart + index
  );
  const scheduleGridColumns = `130px 240px repeat(${calendarDays.length}, 44px)`;
  const barColors = [
    "bg-[#171717]",
    "bg-[#24415f]",
    "bg-[#50624d]",
    "bg-[#7a6a42]"
  ];

  function getTimelinePosition(item: ProjectScheduleItem) {
    const visibleStart = item.startDate < firstDate ? firstDate : item.startDate;
    const visibleEnd = item.endDate > lastDate ? lastDate : item.endDate;
    const startIndex = calendarDays.findIndex((day) => day.value === visibleStart);
    const endIndex = calendarDays.findIndex((day) => day.value === visibleEnd);

    return {
      startColumn: startIndex + 3,
      endColumn: endIndex + 4
    };
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">공정표</h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            엑셀 공정표를 가져오거나 공정 이름을 직접 추가해 월간 일정 막대를 표시합니다.
          </p>
          {scheduleImportMessage ? (
            <p className="mt-2 text-xs font-medium text-[#4d4d4d]">
              {scheduleImportMessage}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setIsScheduleListOpen(true)}
          >
            <ClipboardList size={15} aria-hidden />
            공종 리스트
          </button>
          <label
            className={`${secondaryButtonClass} ${
              isImportingSchedule ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            <Upload size={15} aria-hidden />
            {isImportingSchedule ? "가져오는 중" : "엑셀 가져오기"}
            <input
              type="file"
              accept=".xls,.xlsx,.xlsm,.csv"
              className="sr-only"
              disabled={isImportingSchedule}
              onChange={importScheduleFile}
            />
          </label>
          <button
            type="button"
            className={`${secondaryButtonClass} ${
              isExportingSchedule || items.length === 0
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
            onClick={exportScheduleFile}
            disabled={isExportingSchedule || items.length === 0}
          >
            <Download size={15} aria-hidden />
            {isExportingSchedule ? "내보내는 중" : "엑셀 내보내기"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => moveCalendarMonth(-1)}
          >
            이전
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              const today = getTodayInputValue();

              setSelectedScheduleDate(today);
              setSchedulePickerMonth(today.slice(0, 7));
              setCalendarMonth(today.slice(0, 7));
            }}
          >
            오늘
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => moveCalendarMonth(1)}
          >
            다음
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-[8px] border border-[#ebebeb] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_140px_150px_150px_auto]">
          <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
            공정 이름
            <input
              className="h-10 w-full rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              placeholder="공정명"
              value={draft.title}
              onChange={(e) =>
                setDraft((state) => ({ ...state, title: e.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
            분류
            <input
              className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              placeholder="분류"
              value={draft.category}
              onChange={(e) =>
                setDraft((state) => ({ ...state, category: e.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
            시작일
            <input
              type="date"
              className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              value={draft.startDate}
              onChange={(e) =>
                setDraft((state) => ({ ...state, startDate: e.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[#4d4d4d]">
            종료일
            <input
              type="date"
              className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              value={draft.endDate}
              onChange={(e) =>
                setDraft((state) => ({ ...state, endDate: e.target.value }))
              }
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              onClick={saveDraft}
            >
              {draft.id ? "수정" : "추가"}
            </button>
            {draft.id ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={resetDraft}
              >
                취소
              </button>
            ) : null}
            {draft.id ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => removeItem(draft.id)}
              >
                삭제
              </button>
            ) : null}
          </div>
        </div>
        <textarea
          className="mt-3 min-h-[72px] w-full rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
          placeholder="메모"
          value={draft.notes}
          onChange={(e) =>
            setDraft((state) => ({ ...state, notes: e.target.value }))
          }
        />
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white">
        <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-3">
          <div>
            <p className="text-base font-semibold text-[#171717]">{monthLabel}</p>
            <p className="mt-1 text-xs text-[#8f8f8f]">
              표시 공정 {visibleItems.length}개 / 전체 {items.length}개
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white text-[#171717] transition hover:border-[#171717]"
              aria-label="날짜 이동"
              title="날짜 이동"
              onClick={() => {
                setSchedulePickerMonth(calendarMonth);
                setIsScheduleCalendarOpen((value) => !value);
              }}
            >
              <CalendarDays size={15} aria-hidden />
            </button>

            {isScheduleCalendarOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[350px] rounded-[8px] border border-[#ebebeb] bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="h-9 rounded-[6px] border border-[#ebebeb] px-3 text-xs font-semibold whitespace-nowrap text-[#4d4d4d] transition hover:border-[#171717] hover:text-[#171717]"
                    onClick={() => moveSchedulePickerMonth(-1)}
                  >
                    이전
                  </button>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 rounded-[6px] border border-[#ebebeb] bg-white px-2 text-sm font-semibold text-[#171717] outline-none focus:border-[#171717]"
                      value={schedulePickerYear}
                      onChange={(event) =>
                        setSchedulePickerMonth(
                          `${event.target.value}-${String(
                            schedulePickerMonthNumber
                          ).padStart(2, "0")}`
                        )
                      }
                    >
                      {schedulePickerYears.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 rounded-[6px] border border-[#ebebeb] bg-white px-2 text-sm font-semibold text-[#171717] outline-none focus:border-[#171717]"
                      value={schedulePickerMonthNumber}
                      onChange={(event) =>
                        setSchedulePickerMonth(
                          `${schedulePickerYear}-${String(
                            Number(event.target.value)
                          ).padStart(2, "0")}`
                        )
                      }
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (month) => (
                          <option key={month} value={month}>
                            {month}월
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="h-9 rounded-[6px] border border-[#ebebeb] px-3 text-xs font-semibold whitespace-nowrap text-[#4d4d4d] transition hover:border-[#171717] hover:text-[#171717]"
                    onClick={() => moveSchedulePickerMonth(1)}
                  >
                    다음
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#8f8f8f]">
                  {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => (
                    <div key={weekday} className="py-1">
                      {weekday}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from(
                    { length: schedulePickerMonthStart.getDay() },
                    (_, index) => (
                      <div key={`blank-${index}`} className="h-9" />
                    )
                  )}
                  {schedulePickerDays.map((day) => {
                    const isSelected = day.value === selectedScheduleDate;
                    const isToday = day.value === getTodayInputValue();

                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`h-9 min-w-0 rounded-[6px] text-xs font-semibold leading-none transition ${
                          isSelected
                            ? "bg-[#171717] text-white"
                            : isToday
                              ? "border border-[#171717] text-[#171717]"
                              : day.weekday === 0 || day.weekday === 6
                                ? "bg-[#f6f6f6] text-[#8f8f8f] hover:bg-[#eeeeee]"
                                : "text-[#4d4d4d] hover:bg-[#f2f2f2]"
                        }`}
                        onClick={() => selectScheduleCalendarDate(day.value)}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div
              className="grid border-b border-[#ebebeb] bg-[#fcfcfc]"
              style={{
                gridTemplateColumns: scheduleGridColumns
              }}
            >
              <div className="sticky left-0 z-20 border-r border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-xs font-semibold text-[#4d4d4d]">
                대공종
              </div>
              <div className="sticky left-[130px] z-20 border-r border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-xs font-semibold text-[#4d4d4d]">
                세부공종
              </div>
              {calendarDays.map((day) => (
                <div
                  key={day.value}
                  className={`border-r border-[#ebebeb] px-1 py-2 text-center text-[11px] ${
                    day.value === selectedScheduleDate
                      ? "bg-[#171717] text-white"
                      : day.weekday === 0 || day.weekday === 6
                      ? "bg-[#f6f6f6] text-[#8f8f8f]"
                      : "text-[#4d4d4d]"
                  }`}
                >
                  <div className="font-semibold">{day.day}</div>
                  <div className="mt-1">
                    {["일", "월", "화", "수", "목", "금", "토"][day.weekday]}
                  </div>
                </div>
              ))}
            </div>

            {visibleItems.length === 0 ? (
              <div className="grid min-h-[180px] place-items-center bg-white">
                <div className="text-center">
                  <ChartNoAxesGantt
                    size={36}
                    className="mx-auto text-[#c0c0c0]"
                    aria-hidden
                  />
                  <p className="mt-3 text-sm font-semibold text-[#4d4d4d]">
                    이 달에 표시할 공정이 없습니다.
                  </p>
                </div>
              </div>
            ) : null}

            {visibleItems.map((item, index) => {
              const majorCategory = getScheduleMajorCategory(item);
              const previousItem = index > 0 ? visibleItems[index - 1] : null;
              const isFirstMajorGroupItem =
                !previousItem ||
                getScheduleMajorCategory(previousItem) !== majorCategory;
              const position = getTimelinePosition(item);
              const progress = calculateScheduleProgress(
                item.startDate,
                item.endDate
              );

              return (
                <div
                  key={item.id}
                  className={`grid min-h-[56px] border-b border-[#f2f2f2] last:border-b-0 ${
                    isFirstMajorGroupItem && index > 0 ? "border-t border-t-[#d7d7d7]" : ""
                  }`}
                  style={{
                    gridTemplateColumns: scheduleGridColumns
                  }}
                >
                  <button
                    type="button"
                    className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-[#ebebeb] bg-white px-4 text-left text-xs font-medium text-[#6f6f6f] transition hover:bg-[#fcfcfc]"
                    aria-label={`${majorCategory} ${item.title} 수정`}
                    onClick={() => editItem(item)}
                  >
                    {isFirstMajorGroupItem ? (
                      <>
                        <ChartNoAxesGantt
                          size={15}
                          className="shrink-0 text-[#8f8f8f]"
                          aria-hidden
                        />
                        <span className="truncate">{majorCategory}</span>
                      </>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="sticky left-[130px] z-10 flex min-w-0 items-center border-r border-[#ebebeb] bg-white px-4 text-left text-sm font-semibold text-[#171717] transition hover:bg-[#fcfcfc]"
                    onClick={() => editItem(item)}
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                  {calendarDays.map((day) => (
                    <div
                      key={`${item.id}-${day.value}`}
                      className={`border-r border-[#f2f2f2] ${
                        day.value === selectedScheduleDate
                          ? "bg-[#f0f0f0]"
                          : day.weekday === 0 || day.weekday === 6
                          ? "bg-[#fcfcfc]"
                          : "bg-white"
                      }`}
                    />
                  ))}
                  <button
                    type="button"
                    className={`z-[1] my-3 flex min-w-0 items-center gap-2 rounded-[6px] px-3 text-left text-xs font-semibold text-white shadow-sm ${
                      barColors[index % barColors.length]
                    }`}
                    style={{
                      gridColumn: `${position.startColumn} / ${position.endColumn}`,
                      gridRow: "1"
                    }}
                    title={`${item.title} ${item.startDate} - ${item.endDate}`}
                    onClick={() => editItem(item)}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="shrink-0 text-white/80">
                      {progress}%
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isScheduleListOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-list-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="공종 리스트 닫기"
            onClick={() => setIsScheduleListOpen(false)}
          />
          <div className="relative z-10 flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-[8px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-5 py-4">
              <div>
                <h3
                  id="schedule-list-title"
                  className="text-lg font-semibold text-[#171717]"
                >
                  공종 리스트
                </h3>
                <p className="mt-1 text-xs text-[#8f8f8f]">
                  대공종 {scheduleListGroups.length}개 / 세부공종{" "}
                  {scheduleListGroups.reduce(
                    (total, group) => total + group.items.length,
                    0
                  )}
                  개
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#ebebeb] px-3 text-sm font-medium text-[#d92d20] transition hover:border-[#d92d20] hover:bg-[#fff4f2]"
                  onClick={resetScheduleItems}
                  disabled={items.length === 0}
                >
                  <RotateCcw size={15} aria-hidden />
                  전체 초기화
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#ebebeb] text-[#4d4d4d] transition hover:border-[#171717] hover:text-[#171717]"
                  aria-label="공종 리스트 닫기"
                  onClick={() => setIsScheduleListOpen(false)}
                >
                  <X size={17} aria-hidden />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5">
              {scheduleListGroups.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center rounded-[8px] border border-dashed border-[#d7d7d7] text-sm font-medium text-[#8f8f8f]">
                  등록된 공종이 없습니다.
                </div>
              ) : (
                <div className="grid gap-4">
                  {scheduleListGroups.map((group) => (
                    <section
                      key={group.majorCategory}
                      className="overflow-hidden rounded-[8px] border border-[#ebebeb]"
                    >
                      <div className="flex items-center justify-between bg-[#fcfcfc] px-4 py-3">
                        <h4 className="text-sm font-semibold text-[#171717]">
                          {group.majorCategory}
                        </h4>
                        <span className="text-xs font-medium text-[#8f8f8f]">
                          {group.items.length}개
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_minmax(220px,1fr)_120px_120px_72px] border-t border-[#ebebeb] bg-white text-xs">
                        <div className="border-r border-[#ebebeb] px-4 py-2 font-semibold text-[#4d4d4d]">
                          대공종
                        </div>
                        <div className="border-r border-[#ebebeb] px-4 py-2 font-semibold text-[#4d4d4d]">
                          세부공종
                        </div>
                        <div className="border-r border-[#ebebeb] px-4 py-2 font-semibold text-[#4d4d4d]">
                          시작일
                        </div>
                        <div className="border-r border-[#ebebeb] px-4 py-2 font-semibold text-[#4d4d4d]">
                          종료일
                        </div>
                        <div className="px-3 py-2 text-center font-semibold text-[#4d4d4d]">
                          삭제
                        </div>
                        {group.items.map((item, itemIndex) => (
                          <Fragment key={item.id}>
                            <div className="border-r border-t border-[#f2f2f2] px-4 py-2 text-[#6f6f6f]">
                              {itemIndex === 0 ? group.majorCategory : ""}
                            </div>
                            <div className="border-r border-t border-[#f2f2f2] px-4 py-2 font-medium text-[#171717]">
                              {item.title}
                            </div>
                            <div className="border-r border-t border-[#f2f2f2] px-4 py-2 text-[#6f6f6f]">
                              {item.startDate}
                            </div>
                            <div className="border-r border-t border-[#f2f2f2] px-4 py-2 text-[#6f6f6f]">
                              {item.endDate}
                            </div>
                            <div className="flex items-center justify-center border-t border-[#f2f2f2] px-3 py-1.5">
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#fff4f2] hover:text-[#d92d20]"
                                aria-label={`${item.title} 공종 삭제`}
                                title="삭제"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 size={15} aria-hidden />
                              </button>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProjectScheduleSectionLegacy({ project }: { project: WorkspaceProject }) {
  const [items, setItems] = useState<ProjectScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">(
    "calendar"
  );
  const [draft, setDraft] = useState({
    id: "",
    title: "",
    category: "공정",
    startDate: getTodayInputValue(),
    endDate: getTodayInputValue(),
    progress: 0,
    notes: ""
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(getProjectSchedules(project.id));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [project.id]);

  function persist(nextItems: ProjectScheduleItem[]) {
    const otherItems = readProjectSchedules().filter(
      (item) => item.projectId !== project.id
    );
    const sorted = [...nextItems].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );

    storeProjectSchedules([...otherItems, ...sorted]);
    setItems(sorted);
  }

  function resetDraft() {
    setDraft({
      id: "",
      title: "",
      category: "공정",
      startDate: getTodayInputValue(),
      endDate: getTodayInputValue(),
      progress: 0,
      notes: ""
    });
  }

  function saveDraft() {
    if (!draft.title.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const existing = draft.id ? items.find((item) => item.id === draft.id) : null;
    const nextItem: ProjectScheduleItem = {
      id: draft.id || crypto.randomUUID(),
      projectId: project.id,
      title: draft.title.trim(),
      category: draft.category.trim() || "공정",
      startDate: draft.startDate,
      endDate: draft.endDate,
      progress: Math.max(0, Math.min(100, Number(draft.progress) || 0)),
      notes: draft.notes.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    persist(
      draft.id
        ? items.map((item) => (item.id === draft.id ? nextItem : item))
        : [nextItem, ...items]
    );
    resetDraft();
  }

  function editItem(item: ProjectScheduleItem) {
    setDraft({
      id: item.id,
      title: item.title,
      category: item.category,
      startDate: item.startDate,
      endDate: item.endDate,
      progress: item.progress,
      notes: item.notes
    });
  }

  function removeItem(itemId: string) {
    persist(items.filter((item) => item.id !== itemId));
    if (draft.id === itemId) {
      resetDraft();
    }
  }

  const timelineItems = items.map((item) => ({
    ...item,
    spanDays:
      Math.max(
        1,
        Math.floor(
          (new Date(`${item.endDate}T00:00:00`).getTime() -
            new Date(`${item.startDate}T00:00:00`).getTime()) /
            86_400_000
        ) + 1
      )
  }));

  return (
    <section className="rounded-[8px] border border-[#ebebeb] bg-white p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">공정표</h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            공정 일정을 등록하고 달력 또는 타임라인으로 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => setViewMode("calendar")}>달력</button>
          <button type="button" className={secondaryButtonClass} onClick={() => setViewMode("timeline")}>타임라인</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-4">
          <div className="grid gap-3">
            <input
              className="h-10 w-full rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none"
              placeholder="공정명"
              value={draft.title}
              onChange={(e) =>
                setDraft((state) => ({ ...state, title: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none"
                placeholder="분류"
                value={draft.category}
                onChange={(e) =>
                  setDraft((state) => ({ ...state, category: e.target.value }))
                }
              />
              <input
                type="number"
                min="0"
                max="100"
                className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none"
                placeholder="진행률"
                value={draft.progress}
                onChange={(e) =>
                  setDraft((state) => ({
                    ...state,
                    progress: Number(e.target.value)
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft((state) => ({ ...state, startDate: e.target.value }))
                }
              />
              <input
                type="date"
                className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm outline-none"
                value={draft.endDate}
                onChange={(e) =>
                  setDraft((state) => ({ ...state, endDate: e.target.value }))
                }
              />
            </div>
            <textarea
              className="min-h-[96px] w-full rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm outline-none"
              placeholder="메모"
              value={draft.notes}
              onChange={(e) =>
                setDraft((state) => ({ ...state, notes: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <button type="button" className={primaryButtonClass} onClick={saveDraft}>
                {draft.id ? "수정" : "추가"}
              </button>
              {draft.id ? (
                <button type="button" className={secondaryButtonClass} onClick={resetDraft}>
                  취소
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#ebebeb] bg-white p-4">
          {viewMode === "calendar" ? (
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-[#8f8f8f]">등록된 공정표가 없습니다.</p>
              ) : null}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-3 text-left"
                  onClick={() => editItem(item)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate text-sm">{item.title}</strong>
                    <span className="text-xs text-[#8f8f8f]">{item.progress}%</span>
                  </div>
                  <div className="mt-1 text-xs text-[#4d4d4d]">
                    {item.startDate} - {item.endDate} · {item.category}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {timelineItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-[#8f8f8f]">{item.progress}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#f0f0f0]">
                    <div
                      className="h-3 rounded-full bg-[#171717]"
                      style={{ width: `${Math.max(8, item.progress)}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#4d4d4d]">
                    {item.startDate} ~ {item.endDate} ({item.spanDays}일)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[8px] border border-[#ebebeb] px-3 py-2 text-sm"
            >
              <span className="truncate">{item.title}</span>
              <div className="flex gap-2">
                <button type="button" className={secondaryButtonClass} onClick={() => editItem(item)}>
                  수정
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => removeItem(item.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DailyReportEditorDialog({
  project,
  report,
  subcontractorOptions,
  onClose,
  onChangeReport,
  onUpdateReport,
}: {
  project: WorkspaceProject;
  report: ConstructionDailyReport;
  subcontractorOptions: string[];
  onClose: () => void;
  onChangeReport: (report: ConstructionDailyReport) => void;
  onUpdateReport: (
    patch: Partial<
      Pick<
        ConstructionDailyReport,
        | "reportDate"
        | "weather"
        | "lowTemp"
        | "highTemp"
        | "siteManager"
        | "notes"
        | "photos"
      >
    >
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(
    () => !hasDailyReportDocumentContent(report)
  );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  async function loadKmaWeather() {
    if (isLoadingWeather) {
      return;
    }

    setIsLoadingWeather(true);

    try {
      const forecastDate = report.reportDate.replaceAll("-", "");
      const response = await fetch(`/api/weather/kma?date=${forecastDate}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as KmaWeatherResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "기상청 날씨를 불러오지 못했습니다.");
      }

      onUpdateReport({
        weather: payload.weather ?? report.weather,
        lowTemp: payload.lowTemp ?? report.lowTemp,
        highTemp: payload.highTemp ?? report.highTemp
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "기상청 날씨를 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingWeather(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-5 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[1180px] overflow-hidden rounded-[16px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] p-5">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <ClipboardList size={18} aria-hidden />
              {report.reportDate} 공사일보 작성
            </div>
            <p className="mt-1 text-sm text-[#8f8f8f]">
              입력 내용은 프로젝트별 날짜 문서에 자동 저장됩니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() =>
                void downloadDailyReportsPdf(project, [report]).catch((error) => {
                  window.alert(
                    error instanceof Error
                      ? error.message
                      : "PDF 저장에 실패했습니다."
                  );
                })
              }
            >
              <Download size={15} aria-hidden />
              PDF 저장
            </button>
            {isEditing ? (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setIsEditing(false)}
              >
                <Save size={15} aria-hidden />
                완료
              </button>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setIsEditing(true)}
              >
                수정
              </button>
            )}
            {isEditing ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void loadKmaWeather()}
                disabled={isLoadingWeather}
              >
                <CloudSun size={15} aria-hidden />
                {isLoadingWeather ? "불러오는 중" : "기상청 불러오기"}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
              aria-label="공사일보 작성 닫기"
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-84px)] overflow-y-auto bg-[#f7f7f7] p-5">
          <DailyReportDocumentPreview
            isEditing={isEditing}
            previousReport={getPreviousDailyReport(
              getProjectDailyReports(report.projectId),
              report
            )}
            report={report}
            subcontractorOptions={subcontractorOptions}
            onChange={isEditing ? onChangeReport : () => undefined}
          />
        </div>
      </div>
    </div>
  );
}

function CreateProjectDialog({
  projectDescription,
  projectName,
  setProjectDescription,
  setProjectInvite,
  setProjectName,
  onClose,
  onCreate
}: {
  projectDescription: string;
  projectName: string;
  setProjectDescription: (value: string) => void;
  setProjectInvite: (value: ProjectInvitedMember[]) => void;
  setProjectName: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [invitedMembers, setInvitedMembers] = useState<
    Array<{ name: string; username: string }>
  >([]);

  async function addInvitedMember() {
    const username = inviteUsername.trim();

    if (username.length < 3) {
      setInviteMessage("아이디를 3자 이상 입력해 주세요.");
      return;
    }

    if (invitedMembers.some((member) => member.username === username)) {
      setInviteMessage("이미 초대 목록에 추가된 아이디입니다.");
      return;
    }

    setIsCheckingInvite(true);
    setInviteMessage(null);

    try {
      const response = await fetch(
        `/api/auth/users/lookup?username=${encodeURIComponent(username)}`,
        {
          cache: "no-store"
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        user?: {
          name: string;
          username: string;
        };
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "가입된 아이디를 찾을 수 없습니다.");
      }

      const nextMembers = [...invitedMembers, payload.user];
      setInvitedMembers(nextMembers);
      setProjectInvite(nextMembers);
      setInviteUsername("");
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : "가입된 아이디를 찾을 수 없습니다."
      );
    } finally {
      setIsCheckingInvite(false);
    }
  }

  function removeInvitedMember(username: string) {
    const nextMembers = invitedMembers.filter(
      (member) => member.username !== username
    );
    setInvitedMembers(nextMembers);
    setProjectInvite(nextMembers);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-[16px] border border-[#ebebeb] bg-white p-6 text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">
              New Project
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
              새 프로젝트 만들기
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="새 프로젝트 만들기 닫기"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#171717]">
            프로젝트 이름
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="프로젝트 이름"
              className={`mt-2 w-full ${inputClass}`}
            />
          </label>

          <label className="block text-sm font-medium text-[#171717]">
            프로젝트 설명
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="프로젝트 설명"
              className={`mt-2 min-h-24 w-full ${textareaClass}`}
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-[#171717]">
              멤버 초대
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(event) => setInviteUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addInvitedMember();
                    }
                  }}
                  placeholder="가입한 아이디 입력"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void addInvitedMember()}
                  disabled={isCheckingInvite}
                >
                  {isCheckingInvite ? "찾는 중..." : "초대"}
                </button>
              </div>
            </label>

            {inviteMessage ? (
              <p className="mt-2 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm text-[#4d4d4d]">
                {inviteMessage}
              </p>
            ) : null}

            {invitedMembers.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitedMembers.map((member) => (
                  <span
                    key={member.username}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                  >
                    {member.name} · {member.username}
                    <button
                      type="button"
                      className="text-[#8f8f8f] transition hover:text-[#171717]"
                      aria-label={`${member.username} 초대 제거`}
                      onClick={() => removeInvitedMember(member.username)}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={onCreate}
            disabled={!projectName.trim()}
          >
            <Plus size={16} aria-hidden />
            프로젝트 생성
          </button>
        </div>
      </div>
    </div>
  );
}

type ProjectSettingsTabKey =
  | "organization"
  | "permissions"
  | "documents"
  | "overview"
  | "project-info"
  | "schedule"
  | "files";

const projectSettingsTabs: Array<{
  key: ProjectSettingsTabKey;
  label: string;
}> = [
  { key: "organization", label: "소속설정" },
  { key: "permissions", label: "권한설정" },
  { key: "documents", label: "문서설정" },
  { key: "overview", label: "공사개요" },
  { key: "project-info", label: "프로젝트 정보" },
  { key: "schedule", label: "공정관리" },
  { key: "files", label: "파일관리" }
];

function ProjectSettingsDialog({
  activeProjectDraft,
  currentUser,
  hasProjectChanges,
  models,
  onClose,
  onDeleteModel,
  onUpdateModelVersion,
  onReset,
  onSave,
  onUpdateInvitedMembers,
  onUpdateSubcontractors,
  onUpdateDraft,
  variant = "modal"
}: {
  activeProjectDraft: WorkspaceProject;
  currentUser: AuthSessionUser;
  hasProjectChanges: boolean;
  models: IfcModelSummary[];
  onClose: () => void;
  onDeleteModel: (modelId: string, fileName: string) => void;
  onUpdateModelVersion: (
    modelId: string,
    modelVersion: string | null
  ) => Promise<void>;
  onReset: () => void;
  onSave: () => void;
  onUpdateInvitedMembers: (invitedMembers: ProjectInvitedMember[]) => void;
  onUpdateSubcontractors: (subcontractors: string[]) => void;
  onUpdateDraft: (
    patch: Partial<WorkspaceProjectEditableFields>
  ) => void;
  variant?: "modal" | "page";
}) {
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<ProjectSettingsTabKey>("overview");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [subcontractorName, setSubcontractorName] = useState("");
  const invitedMembers = getProjectInvitedMemberSummaries(activeProjectDraft);
  const subcontractors = activeProjectDraft.subcontractors ?? [];
  const projectOwner = getProjectOwner(activeProjectDraft, currentUser);
  const isProjectOwner =
    currentUser.role === "admin" || projectOwner.username === currentUser.username;

  async function addInvitedMember() {
    const username = inviteUsername.trim();

    if (username.length < 3) {
      setInviteMessage("아이디를 3자 이상 입력해 주세요.");
      return;
    }

    if (
      normalizeInvitedMembers(activeProjectDraft.invitedMembers).some(
        (member) => member.username === username
      )
    ) {
      setInviteMessage("이미 초대된 아이디입니다.");
      return;
    }

    setIsCheckingInvite(true);
    setInviteMessage(null);

    try {
      const response = await fetch(
        `/api/auth/users/lookup?username=${encodeURIComponent(username)}`,
        {
          cache: "no-store"
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        user?: {
          name: string;
          username: string;
        };
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "가입된 아이디를 찾을 수 없습니다.");
      }

      onUpdateInvitedMembers([
        ...normalizeInvitedMembers(activeProjectDraft.invitedMembers),
        payload.user
      ]);
      setInviteUsername("");
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : "가입된 아이디를 찾을 수 없습니다."
      );
    } finally {
      setIsCheckingInvite(false);
    }
  }

  function removeInvitedMember(username: string) {
    onUpdateInvitedMembers(
      normalizeInvitedMembers(activeProjectDraft.invitedMembers).filter(
        (member) => member.username !== username
      )
    );
  }

  function addSubcontractor() {
    const name = subcontractorName.trim();

    if (!name || subcontractors.includes(name)) {
      return;
    }

    onUpdateSubcontractors([...subcontractors, name]);
    setSubcontractorName("");
  }

  function removeSubcontractor(name: string) {
    onUpdateSubcontractors(subcontractors.filter((item) => item !== name));
  }

  function updateCoverImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpdateDraft({
        coverImage: typeof reader.result === "string" ? reader.result : null
      });
    };
    reader.readAsDataURL(file);
  }

  const content = (
    <div
      className={
        variant === "modal"
          ? "flex max-h-[88vh] w-full max-w-4xl flex-col rounded-[16px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          : "flex w-full flex-col rounded-[8px] border border-[#ebebeb] bg-white text-[#171717]"
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-6 py-5">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">프로젝트 설정</h2>
        </div>
        {variant === "modal" ? (
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="프로젝트 설정 닫기"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="border-b border-[#e2e2e2]">
        <div className="flex gap-0 overflow-x-auto bg-[#f8f8f8] px-5 pt-5">
          {projectSettingsTabs.map((tab) => {
            const isActive = tab.key === activeSettingsTab;

            return (
              <button
                key={tab.key}
                type="button"
                className={`h-10 shrink-0 rounded-t-[6px] border border-b-0 px-4 text-sm font-medium transition ${
                  isActive
                    ? "border-[#dedede] bg-white text-[#23a96b]"
                    : "border-[#e6e6e6] bg-[#fbfbfb] text-[#171717] hover:bg-white"
                }`}
                onClick={() => setActiveSettingsTab(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={
          variant === "modal"
            ? "min-h-0 overflow-y-auto px-6 py-5"
            : "px-6 py-5"
        }
      >
        {activeSettingsTab === "overview" ? (
          <ProjectSettingsOverview
            activeProjectDraft={activeProjectDraft}
            invitedMembers={invitedMembers}
            models={models}
            projectOwner={projectOwner}
            subcontractors={subcontractors}
          />
        ) : null}

        {activeSettingsTab === "project-info" ? (
        <section>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">프로젝트 속성</h3>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                프로젝트 기본 정보 표에 표시될 항목을 수정합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={onReset}
                disabled={!hasProjectChanges}
              >
                <RotateCcw size={14} aria-hidden />
되돌리기
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-[100px] bg-[#171717] px-3 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={onSave}
                disabled={!activeProjectDraft.name.trim() || !hasProjectChanges}
              >
                <Save size={14} aria-hidden />
                저장                </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-medium text-[#171717]">대표 이미지</p>
              <div className="mt-2 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[8px] border border-[#ebebeb] bg-[#f0f0f0]">
                {activeProjectDraft.coverImage ? (
                  // User-uploaded data URLs are previewed directly instead of using Next image optimization.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeProjectDraft.coverImage}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="text-center text-[#8f8f8f]">
                    <FolderKanban size={28} className="mx-auto" aria-hidden />
                    <p className="mt-2 text-xs">대표 이미지 없음</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]">
                  이미지 선택
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => updateCoverImage(event.target.files?.[0])}
                  />
                </label>
                {activeProjectDraft.coverImage ? (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
                    onClick={() => onUpdateDraft({ coverImage: null })}
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-x-8 gap-y-5 xl:grid-cols-2">
                <ProjectSettingsTextField
                  label="프로젝트명"
                  value={activeProjectDraft.name}
                  onChange={(value) => onUpdateDraft({ name: value })}
                />
                <ProjectSettingsLocationField
                  label="위치"
                  locations={getProjectLocations(activeProjectDraft)}
                  onChange={(locations) => onUpdateDraft({ locations })}
                  onOpenSearch={() => setIsLocationSearchOpen(true)}
                />
                <ProjectSettingsTextField
                  label="발주처"
                  value={activeProjectDraft.client ?? ""}
                  onChange={(value) => onUpdateDraft({ client: value })}
                />
                <ProjectSettingsTextField
                  label="시공사"
                  value={activeProjectDraft.contractor ?? ""}
                  onChange={(value) => onUpdateDraft({ contractor: value })}
                />
                <ProjectSettingsTextField
                  label="감리"
                  value={activeProjectDraft.inspector ?? ""}
                  onChange={(value) => onUpdateDraft({ inspector: value })}
                />
                <ProjectSettingsTextField
                  label="설계사"
                  value={activeProjectDraft.designer ?? ""}
                  onChange={(value) => onUpdateDraft({ designer: value })}
                />
                <ProjectSettingsDateRangeField
                  label="공사기간"
                  value={activeProjectDraft.constructionPeriod ?? ""}
                  onChange={(value) =>
                    onUpdateDraft({ constructionPeriod: value })
                  }
                />
              </div>
              <ProjectSettingsTextareaField
                label="주요사항"
                value={activeProjectDraft.projectNotes ?? ""}
                onChange={(value) => onUpdateDraft({ projectNotes: value })}
              />
              <ProjectSettingsTextareaField
                label="기타"
                value={activeProjectDraft.etc ?? ""}
                onChange={(value) => onUpdateDraft({ etc: value })}
              />
              <p className="text-sm font-medium text-[#4d4d4d]">
                소유자: {projectOwner.name}
              </p>
            </div>
          </div>
        </section>
        ) : null}

        {isProjectOwner && activeSettingsTab === "permissions" ? (
          <section className="mt-7 border-t border-[#ebebeb] pt-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold">멤버 초대</h3>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                가입된 아이디를 찾아 프로젝트 멤버로 초대합니다.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUsername}
                onChange={(event) => setInviteUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addInvitedMember();
                  }
                }}
                placeholder="가입한 아이디 입력"
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void addInvitedMember()}
                disabled={isCheckingInvite}
              >
                {isCheckingInvite ? "찾는 중..." : "초대"}
              </button>
            </div>

            {inviteMessage ? (
              <p className="mt-2 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm text-[#4d4d4d]">
                {inviteMessage}
              </p>
            ) : null}

            {invitedMembers.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitedMembers.map((member) => (
                  <span
                    key={member.username}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                  >
                    {member.name} · {member.username}
                    <button
                      type="button"
                      className="text-[#8f8f8f] transition hover:text-[#171717]"
                      aria-label={`${member.username} 초대 제거`}
                      onClick={() => removeInvitedMember(member.username)}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-5 text-sm text-[#8f8f8f]">
                초대된 멤버가 없습니다.
              </div>
            )}
          </section>
        ) : null}

        {isProjectOwner && activeSettingsTab === "organization" ? (
          <section className="mt-7 border-t border-[#ebebeb] pt-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold">협력사</h3>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                프로젝트에 참여하는 협력사를 등록합니다.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={subcontractorName}
                onChange={(event) => setSubcontractorName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubcontractor();
                  }
                }}
                placeholder="협력사명 입력"
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={addSubcontractor}
                disabled={!subcontractorName.trim()}
              >
                추가
              </button>
            </div>

            {subcontractors.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {subcontractors.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                  >
                    {name}
                    <button
                      type="button"
                      className="text-[#8f8f8f] transition hover:text-[#171717]"
                      aria-label={`${name} 협력사 삭제`}
                      onClick={() => removeSubcontractor(name)}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-5 text-sm text-[#8f8f8f]">
                등록된 협력사가 없습니다.
              </div>
            )}
          </section>
        ) : null}

        {activeSettingsTab === "files" ? (
        <section className="mt-7 border-t border-[#ebebeb] pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">IFC 파일 목록</h3>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                이 프로젝트에 포함된 IFC 파일을 확인하고 관리합니다.
              </p>
            </div>
            <p className="text-sm text-[#8f8f8f]">{models.length}개</p>
          </div>

          {models.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-8 text-center">
              <p className="text-sm font-semibold">아직 IFC 파일이 없습니다.</p>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                프로젝트 화면에서 IFC를 업로드하면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <IfcModelTable
              models={models}
              onDelete={onDeleteModel}
              onUpdateVersion={onUpdateModelVersion}
            />
          )}
        </section>
        ) : null}

        {activeSettingsTab === "documents" ||
        activeSettingsTab === "schedule" ? (
          <ProjectSettingsEmptyTab
            tab={
              projectSettingsTabs.find((tab) => tab.key === activeSettingsTab)
                ?.label ?? "설정"
            }
          />
        ) : null}
      </div>
    </div>
  );
  const locationSearchDialog = isLocationSearchOpen ? (
    <NaverLocationSearchDialog
      initialQuery={getProjectLocations(activeProjectDraft)[0] || activeProjectDraft.name}
      onClose={() => setIsLocationSearchOpen(false)}
      onSelect={(location) => {
        onUpdateDraft({
          locations: normalizeProjectLocations([
            ...getProjectLocations(activeProjectDraft),
            location
          ])
        });
        setIsLocationSearchOpen(false);
      }}
    />
  ) : null;

  if (variant === "page") {
    return (
      <>
        {content}
        {locationSearchDialog}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-5 py-8 backdrop-blur-sm">
      {content}
      {locationSearchDialog}
    </div>
  );
}

/*
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-[16px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">프로젝트 설정</h2>
            <p className="mt-1 text-sm text-[#4d4d4d]">
              프로젝트 속성과 IFC 파일 목록을 관리합니다.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="프로젝트 설정 닫기"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="border-b border-[#e2e2e2]">
          <div className="bg-[#57bf84] px-6 py-3 text-sm font-semibold text-white">
            관리자 메뉴
          </div>
          <div className="flex gap-0 overflow-x-auto bg-[#f8f8f8] px-5 pt-5">
            {projectSettingsTabs.map((tab) => {
              const isActive = tab.key === activeSettingsTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`h-10 shrink-0 rounded-t-[6px] border border-b-0 px-4 text-sm font-medium transition ${
                    isActive
                      ? "border-[#dedede] bg-white text-[#23a96b]"
                      : "border-[#e6e6e6] bg-[#fbfbfb] text-[#171717] hover:bg-white"
                  }`}
                  onClick={() => setActiveSettingsTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {activeSettingsTab === "overview" ? (
            <ProjectSettingsOverview
              activeProjectDraft={activeProjectDraft}
              invitedMembers={invitedMembers}
              models={models}
              projectOwner={projectOwner}
              subcontractors={subcontractors}
            />
          ) : null}

          {activeSettingsTab === "project-info" ? (
          <section>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">프로젝트 속성</h3>
                <p className="mt-1 text-sm text-[#4d4d4d]">
                  프로젝트 이름과 설명을 수정합니다.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={onReset}
                  disabled={!hasProjectChanges}
                >
                  <RotateCcw size={14} aria-hidden />
되돌리기
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-[100px] bg-[#171717] px-3 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={onSave}
                  disabled={!activeProjectDraft.name.trim() || !hasProjectChanges}
                >
                  <Save size={14} aria-hidden />
                  저장                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-medium text-[#171717]">대표 이미지</p>
                <div className="mt-2 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[8px] border border-[#ebebeb] bg-[#f0f0f0]">
                  {activeProjectDraft.coverImage ? (
                    // User-uploaded data URLs are previewed directly instead of using Next image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeProjectDraft.coverImage}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-[#8f8f8f]">
                      <FolderKanban size={28} className="mx-auto" aria-hidden />
                      <p className="mt-2 text-xs">대표 이미지 없음</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]">
                    이미지 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => updateCoverImage(event.target.files?.[0])}
                    />
                  </label>
                  {activeProjectDraft.coverImage ? (
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
                      onClick={() => onUpdateDraft({ coverImage: null })}
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block text-sm font-medium text-[#171717]">
                  프로젝트 이름
                  <input
                    type="text"
                    value={activeProjectDraft.name}
                    onChange={(event) =>
                      onUpdateDraft({ name: event.target.value })
                    }
                    className={`mt-2 w-full ${inputClass}`}
                  />
                  <span className="mt-2 block text-sm font-medium text-[#4d4d4d]">
                    소유자: {projectOwner.name}
                  </span>
                </label>
                <label className="block text-sm font-medium text-[#171717]">
                  프로젝트 설명
                  <textarea
                    value={activeProjectDraft.description}
                    onChange={(event) =>
                      onUpdateDraft({ description: event.target.value })
                    }
                    className={`mt-2 w-full ${textareaClass}`}
                    placeholder="프로젝트 설명"
                  />
                </label>
              </div>
            </div>
          </section>
          ) : null}

          {isProjectOwner && activeSettingsTab === "permissions" ? (
            <section className="mt-7 border-t border-[#ebebeb] pt-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold">멤버 초대</h3>
                <p className="mt-1 text-sm text-[#4d4d4d]">
                  가입된 아이디를 찾아 프로젝트 멤버로 초대합니다.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(event) => setInviteUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addInvitedMember();
                    }
                  }}
                  placeholder="가입한 아이디 입력"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void addInvitedMember()}
                  disabled={isCheckingInvite}
                >
                  {isCheckingInvite ? "찾는 중..." : "초대"}
                </button>
              </div>

              {inviteMessage ? (
                <p className="mt-2 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm text-[#4d4d4d]">
                  {inviteMessage}
                </p>
              ) : null}

              {invitedMembers.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {invitedMembers.map((member) => (
                    <span
                      key={member.username}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                    >
                      {member.name} · {member.username}
                      <button
                        type="button"
                        className="text-[#8f8f8f] transition hover:text-[#171717]"
                        aria-label={`${member.username} 초대 제거`}
                        onClick={() => removeInvitedMember(member.username)}
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-5 text-sm text-[#8f8f8f]">
                  초대된 멤버가 없습니다.
                </div>
              )}
            </section>
          ) : null}

          {isProjectOwner && activeSettingsTab === "organization" ? (
            <section className="mt-7 border-t border-[#ebebeb] pt-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold">협력사</h3>
                <p className="mt-1 text-sm text-[#4d4d4d]">
                  프로젝트에 참여하는 협력사를 등록합니다.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={subcontractorName}
                  onChange={(event) => setSubcontractorName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSubcontractor();
                    }
                  }}
                  placeholder="협력사명 입력"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={addSubcontractor}
                  disabled={!subcontractorName.trim()}
                >
                  추가
                </button>
              </div>

              {subcontractors.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subcontractors.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                    >
                      {name}
                      <button
                        type="button"
                        className="text-[#8f8f8f] transition hover:text-[#171717]"
                        aria-label={`${name} 협력사 삭제`}
                        onClick={() => removeSubcontractor(name)}
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-5 text-sm text-[#8f8f8f]">
                  등록된 협력사가 없습니다.
                </div>
              )}
            </section>
          ) : null}

          {activeSettingsTab === "files" ? (
          <section className="mt-7 border-t border-[#ebebeb] pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">IFC 파일 목록</h3>
                <p className="mt-1 text-sm text-[#4d4d4d]">
                  이 프로젝트에 포함된 IFC 파일을 확인하고 관리합니다.
                </p>
              </div>
              <p className="text-sm text-[#8f8f8f]">{models.length}개</p>
            </div>

            {models.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-8 text-center">
                <p className="text-sm font-semibold">아직 IFC 파일이 없습니다.</p>
                <p className="mt-1 text-sm text-[#4d4d4d]">
                  프로젝트 화면에서 IFC를 업로드하면 이곳에 표시됩니다.
                </p>
              </div>
            ) : (
              <IfcModelTable
                models={models}
                onDelete={onDeleteModel}
                onUpdateVersion={onUpdateModelVersion}
              />
            )}
          </section>
          ) : null}

          {activeSettingsTab === "billing" ||
          activeSettingsTab === "documents" ||
          activeSettingsTab === "schedule" ? (
            <ProjectSettingsEmptyTab
              tab={
                projectSettingsTabs.find((tab) => tab.key === activeSettingsTab)
                  ?.label ?? "설정"
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

*/

function ProjectSettingsTextField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-3">
      <span className="whitespace-nowrap text-sm font-semibold text-[#171717]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full ${inputClass}`}
      />
    </label>
  );
}

function ProjectSettingsLocationField({
  locations,
  label,
  onChange,
  onOpenSearch,
}: {
  label: string;
  locations: string[];
  onChange: (locations: string[]) => void;
  onOpenSearch: () => void;
}) {
  const [manualLocation, setManualLocation] = useState("");

  function addManualLocation() {
    const nextLocation = manualLocation.trim();

    if (!nextLocation) {
      return;
    }

    onChange(normalizeProjectLocations([...locations, nextLocation]));
    setManualLocation("");
  }

  function removeLocation(location: string) {
    onChange(locations.filter((item) => item !== location));
  }

  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-3">
      <div className="flex h-10 items-center gap-2">
        <span className="whitespace-nowrap text-sm font-semibold text-[#171717]">
          {label}
        </span>
        {locations.length > 0 ? (
          <span className="text-xs font-medium text-[#8f8f8f]">
            {locations.length}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={manualLocation}
            onChange={(event) => setManualLocation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManualLocation();
              }
            }}
            placeholder="위치 직접 입력"
            className={`min-w-[220px] flex-1 ${inputClass}`}
          />
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={addManualLocation}
            disabled={!manualLocation.trim()}
          >
            추가
          </button>
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm font-medium text-[#171717] transition hover:bg-[#f6f6f6]"
            onClick={onOpenSearch}
          >
            <Search size={14} aria-hidden />
            네이버 지도 검색
          </button>
        </div>
        {locations.length > 0 ? (
          <div className="mt-2 space-y-2">
            {locations.map((location) => (
              <div
                key={location}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-[#171717]">
                  {location}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[#8f8f8f] transition hover:text-[#171717]"
                  aria-label={`${location} 위치 삭제`}
                  onClick={() => removeLocation(location)}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#8f8f8f]">
            직접 입력하거나 네이버 지도 검색으로 위치를 추가하세요.
          </p>
        )}
      </div>
    </div>
  );
}

function parseDateRangeValue(value: string) {
  const dates = value.match(/\d{4}-\d{2}-\d{2}/g) ?? [];

  return {
    endDate: dates[1] ?? "",
    startDate: dates[0] ?? ""
  };
}

function formatDateRangeValue(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`;
  }

  return startDate || endDate;
}

function ProjectSettingsDateRangeField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const { endDate, startDate } = parseDateRangeValue(value);

  function updateDateRange(nextStartDate: string, nextEndDate: string) {
    onChange(formatDateRangeValue(nextStartDate, nextEndDate));
  }

  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-3">
      <div className="flex h-10 items-center gap-2">
        <span className="whitespace-nowrap text-sm font-semibold text-[#171717]">
          {label}
        </span>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <label className="relative block min-w-0">
          <CalendarDays
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            aria-hidden
          />
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => updateDateRange(event.target.value, endDate)}
            className={`w-full pl-9 ${inputClass}`}
            aria-label="공사 시작일"
          />
        </label>
        <span className="hidden h-10 items-center text-sm text-[#8f8f8f] sm:flex">
          ~
        </span>
        <label className="relative block min-w-0">
          <CalendarDays
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8f8f]"
            aria-hidden
          />
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => updateDateRange(startDate, event.target.value)}
            className={`w-full pl-9 ${inputClass}`}
            aria-label="공사 종료일"
          />
        </label>
      </div>
    </div>
  );
}

function ProjectSettingsTextareaField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid grid-cols-[86px_minmax(0,1fr)] items-start gap-3">
      <span className="pt-2 text-sm font-semibold text-[#171717]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className={`w-full ${textareaClass}`}
      />
    </label>
  );
}

function NaverLocationSearchDialog({
  initialQuery,
  onClose,
  onSelect
}: {
  initialQuery: string;
  onClose: () => void;
  onSelect: (location: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<NaverLocationSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  async function searchLocations() {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setErrorMessage("검색어를 2자 이상 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/locations/naver?query=${encodeURIComponent(trimmedQuery)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as NaverLocationSearchResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "네이버 지도 위치 검색에 실패했습니다.");
      }

      setResults(payload.locations ?? []);
    } catch (error) {
      setResults([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "네이버 지도 위치 검색에 실패했습니다."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(23,23,23,0.24)] px-5 py-8 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col rounded-[14px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_14px_44px_rgba(0,0,0,0.14)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">네이버 지도 위치 검색</h3>
            <p className="mt-1 text-sm text-[#4d4d4d]">
              현장명, 건물명, 주소를 검색한 뒤 위치에 사용할 주소를 선택합니다.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="네이버 지도 위치 검색 닫기"
            onClick={onClose}
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void searchLocations();
            }}
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 서울시청, 강남역, 현장 주소"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[100px] bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={query.trim().length < 2 || isSearching}
            >
              <Search size={14} aria-hidden />
              {isSearching ? "검색 중..." : "검색"}
            </button>
          </form>

          {errorMessage ? (
            <p className="mt-3 rounded-[8px] border border-[#f1d1d1] bg-[#fff7f7] px-3 py-2 text-sm text-[#b42318]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            {results.map((result) => {
              const selectedLocation =
                result.roadAddress || result.address || result.title;

              return (
                <button
                  key={`${result.title}-${result.roadAddress}-${result.address}`}
                  type="button"
                  className="w-full rounded-[10px] border border-[#ebebeb] bg-white px-4 py-3 text-left transition hover:border-[#23a96b] hover:bg-[#f7fffb]"
                  onClick={() => onSelect(selectedLocation)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#171717]">
                        {result.title || selectedLocation}
                      </p>
                      {result.category ? (
                        <p className="mt-1 text-xs text-[#8f8f8f]">
                          {result.category}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eaf8f1] px-2.5 py-1 text-xs font-semibold text-[#23a96b]">
                      선택
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#4d4d4d]">
                    {selectedLocation || "주소 정보 없음"}
                  </p>
                  {result.address && result.address !== result.roadAddress ? (
                    <p className="mt-1 text-xs text-[#8f8f8f]">
                      지번: {result.address}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {hasSearched && !isSearching && !errorMessage && results.length === 0 ? (
            <div className="mt-4 rounded-[10px] border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-6 text-center text-sm text-[#8f8f8f]">
              검색 결과가 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProjectSettingsOverview({
  activeProjectDraft,
  invitedMembers,
  models,
  projectOwner,
  subcontractors
}: {
  activeProjectDraft: WorkspaceProject;
  invitedMembers: ProjectInvitedMember[];
  models: IfcModelSummary[];
  projectOwner: ProjectInvitedMember;
  subcontractors: string[];
}) {
  const overviewItems = [
    { label: "프로젝트명", value: activeProjectDraft.name },
    { label: "소유자", value: projectOwner.name },
    { label: "참여 멤버", value: `${invitedMembers.length}명` },
    { label: "협력사", value: `${subcontractors.length}개` },
    { label: "IFC 파일", value: `${models.length}개` }
  ];

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-semibold">공사개요</h3>
        <p className="mt-1 text-sm text-[#4d4d4d]">
          프로젝트 설정의 주요 정보를 한눈에 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {overviewItems.map((item) => (
          <div
            key={item.label}
            className="rounded-[8px] border border-[#ebebeb] bg-[#fcfcfc] p-4"
          >
            <p className="text-xs font-medium text-[#8f8f8f]">{item.label}</p>
            <p className="mt-2 truncate text-lg font-semibold text-[#171717]">
              {item.value || "-"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectSettingsEmptyTab({ tab }: { tab: string }) {
  return (
    <section className="rounded-[8px] border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-8 text-center">
      <Settings size={30} className="mx-auto text-[#c0c0c0]" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-[#4d4d4d]">
        {tab} 설정 영역입니다.
      </p>
      <p className="mt-1 text-sm text-[#8f8f8f]">
        세부 설정 항목은 이후 연결할 수 있습니다.
      </p>
    </section>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="mx-auto max-w-[1480px] px-8 py-7 xl:px-12">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">설정</h2>
        <p className="mt-1 text-sm text-[#4d4d4d]">
          스크롤, 라이트/다크, 언어 변경 기능을 제공합니다.
        </p>
      </div>

      <div className="grid max-w-3xl gap-4">
        <div className={`${surfaceCardClass} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">테마</p>
              <p className="mt-1 text-sm text-[#4d4d4d]">
                화면 모드를 선택하는 설정입니다. 기능은 아직 연결하지 않았습니다.
              </p>
            </div>
            <div className="inline-flex rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] p-1">
              <button className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-white px-3 text-sm font-medium">
                <Sun size={15} aria-hidden />
                라이트              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-medium text-[#8f8f8f]">
                <Moon size={15} aria-hidden />
                다크
              </button>
            </div>
          </div>
        </div>

        <div className={`${surfaceCardClass} p-5`}>
          <p className="font-semibold">언어</p>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            현재는 한국어 버전만 사용합니다. 이후 언어 전환 구조를 연결합니다.
          </p>
          <div className="mt-4 inline-flex h-10 items-center rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 text-sm font-medium">
            한국어          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${surfaceCardClass} p-5`}>
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#8f8f8f]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function TeamWorkspace({
  currentUser,
  onCreateTeam,
  onUpdateTeam,
  teams
}: {
  currentUser: AuthSessionUser;
  onCreateTeam: (name: string, members: ProjectInvitedMember[]) => void;
  onUpdateTeam: (
    teamId: string,
    patch: Partial<Pick<WorkspaceTeam, "name" | "members">>
  ) => void;
  teams: WorkspaceTeam[];
}) {
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<WorkspaceTeam | null>(null);

  return (
    <div className="mx-auto max-w-[1480px] px-8 py-8 xl:px-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">팀</h2>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            팀을 만들고 가입된 아이디를 멤버로 초대합니다.
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => setIsCreateTeamOpen(true)}
        >
          <Plus size={16} aria-hidden />
          팀 만들기
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ebebeb] bg-white p-10 text-center">
          <p className="text-sm font-semibold">아직 팀이 없습니다.</p>
          <p className="mt-1 text-sm text-[#4d4d4d]">
            팀 만들기 버튼으로 새 팀을 만들 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className={`${surfaceCardClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-[-0.03em]">
                    {team.name}
                  </p>
                  <p className="mt-1 text-sm text-[#4d4d4d]">
                    소유자: {team.owner.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1 text-xs font-semibold text-[#171717]">
                    {team.members.length + 1}명
                  </span>
                  {currentUser.role === "admin" ||
                  team.owner.username === currentUser.username ? (
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                      aria-label={`${team.name} 팀 설정`}
                      title="팀 설정"
                      onClick={() => setEditingTeam(team)}
                    >
                      <Settings size={16} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#ebebeb] bg-[#171717] px-2.5 py-1 text-[11px] font-medium text-white">
                  {team.owner.name}
                </span>
                {team.members.map((member) => (
                  <span
                    key={`${team.id}-${member.username}`}
                    className="rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-2.5 py-1 text-[11px] font-medium text-[#4d4d4d]"
                  >
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateTeamOpen ? (
        <CreateTeamDialog
          onClose={() => setIsCreateTeamOpen(false)}
          onCreate={(name, members) => {
            onCreateTeam(name, members);
            setIsCreateTeamOpen(false);
          }}
        />
      ) : null}

      {editingTeam ? (
        <TeamSettingsDialog
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={(patch) => {
            onUpdateTeam(editingTeam.id, patch);
            setEditingTeam(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateTeamDialog({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, members: ProjectInvitedMember[]) => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [members, setMembers] = useState<ProjectInvitedMember[]>([]);

  async function addMember() {
    const username = inviteUsername.trim();

    if (username.length < 3) {
      setInviteMessage("아이디를 3자 이상 입력해 주세요.");
      return;
    }

    if (members.some((member) => member.username === username)) {
      setInviteMessage("이미 추가된 멤버입니다.");
      return;
    }

    setIsCheckingInvite(true);
    setInviteMessage(null);

    try {
      const response = await fetch(
        `/api/auth/users/lookup?username=${encodeURIComponent(username)}`,
        {
          cache: "no-store"
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        user?: ProjectInvitedMember;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "가입된 아이디를 찾을 수 없습니다.");
      }

      setMembers((currentMembers) => [...currentMembers, payload.user!]);
      setInviteUsername("");
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : "가입된 아이디를 찾을 수 없습니다."
      );
    } finally {
      setIsCheckingInvite(false);
    }
  }

  function removeMember(username: string) {
    setMembers((currentMembers) =>
      currentMembers.filter((member) => member.username !== username)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[480px] rounded-[16px] border border-[#ebebeb] bg-white p-6 text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">
              New Team
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
              팀 만들기
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="팀 만들기 닫기"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#171717]">
            팀 이름
            <input
              type="text"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="팀 이름"
              className={`mt-2 w-full ${inputClass}`}
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-[#171717]">
              멤버 초대
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(event) => setInviteUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addMember();
                    }
                  }}
                  placeholder="가입한 아이디 입력"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void addMember()}
                  disabled={isCheckingInvite}
                >
                  {isCheckingInvite ? "찾는 중..." : "초대"}
                </button>
              </div>
            </label>

            {inviteMessage ? (
              <p className="mt-2 rounded-[6px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-sm text-[#4d4d4d]">
                {inviteMessage}
              </p>
            ) : null}

            {members.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((member) => (
                  <span
                    key={member.username}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                  >
                    {member.name} · {member.username}
                    <button
                      type="button"
                      className="text-[#8f8f8f] transition hover:text-[#171717]"
                      aria-label={`${member.username} 팀 멤버 제거`}
                      onClick={() => removeMember(member.username)}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => onCreate(teamName, members)}
            disabled={!teamName.trim()}
          >
            <Plus size={16} aria-hidden />
            팀 생성
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamSettingsDialog({
  onClose,
  onSave,
  team
}: {
  onClose: () => void;
  onSave: (patch: Pick<WorkspaceTeam, "name" | "members">) => void;
  team: WorkspaceTeam;
}) {
  const [teamName, setTeamName] = useState(team.name);
  const [members, setMembers] = useState<ProjectInvitedMember[]>(team.members);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);

  async function addMember() {
    const username = inviteUsername.trim();

    if (username.length < 3) {
      setInviteMessage("아이디를 3자 이상 입력해 주세요.");
      return;
    }

    if (username === team.owner.username) {
      setInviteMessage("팀 소유자는 이미 팀에 포함되어 있습니다.");
      return;
    }

    if (members.some((member) => member.username === username)) {
      setInviteMessage("이미 추가된 멤버입니다.");
      return;
    }

    setIsCheckingInvite(true);
    setInviteMessage(null);

    try {
      const response = await fetch(
        `/api/auth/users/lookup?username=${encodeURIComponent(username)}`,
        {
          cache: "no-store"
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        user?: ProjectInvitedMember;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "가입된 아이디를 찾을 수 없습니다.");
      }

      setMembers((currentMembers) => [...currentMembers, payload.user!]);
      setInviteUsername("");
    } catch (error) {
      setInviteMessage(
        error instanceof Error
          ? error.message
          : "가입된 아이디를 찾을 수 없습니다."
      );
    } finally {
      setIsCheckingInvite(false);
    }
  }

  function removeMember(username: string) {
    setMembers((currentMembers) =>
      currentMembers.filter((member) => member.username !== username)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-5 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[16px] border border-[#ebebeb] bg-white p-6 text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">
              Team Settings
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
              팀 설정
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
            aria-label="팀 설정 닫기"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#171717]">
            팀 이름
            <input
              type="text"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="팀 이름"
              className={`mt-2 w-full ${inputClass}`}
            />
          </label>

          <div className="rounded-[12px] border border-[#ebebeb] bg-[#fcfcfc] p-4">
            <p className="text-sm font-semibold">팀 소유자</p>
            <p className="mt-1 text-sm text-[#4d4d4d]">
              {team.owner.name} · {team.owner.username}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#171717]">
              멤버 신규 추가
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(event) => setInviteUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addMember();
                    }
                  }}
                  placeholder="가입한 아이디 입력"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void addMember()}
                  disabled={isCheckingInvite}
                >
                  {isCheckingInvite ? "찾는 중..." : "추가"}
                </button>
              </div>
            </label>

            {inviteMessage ? (
              <p className="mt-2 rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#4d4d4d]">
                {inviteMessage}
              </p>
            ) : null}

            {members.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((member) => (
                  <span
                    key={member.username}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ebebeb] bg-[#fcfcfc] px-3 py-1.5 text-xs font-medium text-[#4d4d4d]"
                  >
                    {member.name} · {member.username}
                    <button
                      type="button"
                      className="text-[#8f8f8f] transition hover:text-[#171717]"
                      aria-label={`${member.username} 팀 멤버 제거`}
                      onClick={() => removeMember(member.username)}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#ebebeb] bg-[#fcfcfc] p-5 text-sm text-[#8f8f8f]">
                추가된 멤버가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() =>
              onSave({
                name: teamName,
                members
              })
            }
            disabled={!teamName.trim()}
          >
            <Save size={16} aria-hidden />
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function IfcModelTable({
  models,
  onDelete,
  onUpdateVersion
}: {
  models: IfcModelSummary[];
  onDelete?: (modelId: string, fileName: string) => void;
  onUpdateVersion?: (modelId: string, modelVersion: string | null) => Promise<void>;
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-[#ebebeb] bg-white text-[#171717]">
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[56px_minmax(260px,1.7fr)_150px_190px_120px_72px] border-b border-[#ebebeb] bg-[#fcfcfc] text-sm font-semibold text-[#4d4d4d]">
          <div className="flex h-12 items-center justify-center">
            <span className="size-4 rounded-[4px] border border-[#ebebeb] bg-white" />
          </div>
          <div className="flex h-12 items-center gap-1 px-4">
            이름
            <span className="text-[#8f8f8f]">↑↓</span>
          </div>
          <div className="flex h-12 items-center px-4">상태</div>
          <div className="flex h-12 items-center gap-1 px-4">
            마지막 업데이트
            <span className="text-[#8f8f8f]">↓</span>
          </div>
          <div className="flex h-12 items-center justify-center px-4">버전</div>
          <div className="flex h-12 items-center justify-center px-4" />
        </div>
        <div className="min-w-[760px]">
          {models.map((model) => (
            <div
              key={model.id}
              className="grid grid-cols-[56px_minmax(260px,1.7fr)_150px_190px_120px_72px] border-b border-[#f2f2f2] text-sm last:border-b-0 hover:bg-[#fcfcfc]"
            >
              <div className="flex h-14 items-center justify-center">
                <span className="size-4 rounded-[4px] border border-[#ebebeb] bg-white" />
              </div>
              <div className="flex h-14 min-w-0 items-center px-4">
                <Link
                  href={`/viewer?modelId=${model.id}`}
                  className="truncate font-semibold text-[#171717] transition hover:text-[#0070f3]"
                  title={`${model.originalFileName} 열기`}
                >
                  {model.originalFileName}
                </Link>
              </div>
              <div className="flex h-14 items-center px-4 text-[#4d4d4d]">
                {getStatusLabel(model.status)}
              </div>
              <div className="flex h-14 items-center px-4 text-[#4d4d4d]">
                {formatUploadedAt(model.updatedAt ?? model.createdAt)}
              </div>
              <div className="flex h-14 items-center justify-center px-4">
                <IfcModelVersionButton
                  model={model}
                  onUpdateVersion={onUpdateVersion}
                />
              </div>
              <div className="flex h-14 items-center justify-center gap-1 px-3">
                {onDelete ? (
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                    title="IFC 파일 삭제"
                    aria-label={`${model.originalFileName} 삭제`}
                    onClick={() => onDelete(model.id, model.originalFileName)}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                ) : null}
                <Link
                  href={`/viewer?modelId=${model.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  title="뷰어에서 열기"
                  aria-label={`${model.originalFileName} 뷰어에서 열기`}
                >
                  <MoreHorizontal size={17} aria-hidden />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IfcModelVersionButton({
  model,
  onUpdateVersion
}: {
  model: IfcModelSummary;
  onUpdateVersion?: (modelId: string, modelVersion: string | null) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleEditVersion() {
    if (!onUpdateVersion || isSaving) {
      return;
    }

    const nextVersion = window.prompt(
      `${model.originalFileName} 버전을 입력하세요.`,
      model.modelVersion ?? "v1"
    );

    if (nextVersion === null) {
      return;
    }

    setIsSaving(true);

    try {
      await onUpdateVersion(model.id, nextVersion.trim() || null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "IFC 버전 수정에 실패했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      className="rounded-[9999px] border border-[#ebebeb] bg-[#fcfcfc] px-2 py-1 text-xs font-semibold text-[#171717] transition hover:bg-[#f6f6f6] disabled:cursor-not-allowed disabled:opacity-60"
      onClick={() => void handleEditVersion()}
      disabled={!onUpdateVersion || isSaving}
      title={onUpdateVersion ? "버전 수정" : undefined}
    >
      {isSaving ? "저장 중" : model.modelVersion || "미지정"}
    </button>
  );
}
