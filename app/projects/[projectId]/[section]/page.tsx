import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ProjectWorkspace,
  type ProjectPageKey
} from "@/components/projects/ProjectWorkspace";
import { AUTH_COOKIE_NAME } from "@/lib/auth/adminAuth";
import { getAuthSessionUser } from "@/lib/auth/session";

const projectPages = new Set<ProjectPageKey>([
  "info",
  "viewer",
  "documents",
  "settings",
  "schedule",
  "progress-payments",
  "ontology",
  "subcontractors",
  "photos",
  "members"
]);

type ProjectSectionPageProps = {
  params: Promise<{
    projectId: string;
    section: string;
  }>;
};

export default async function ProjectSectionPage({
  params
}: ProjectSectionPageProps) {
  const [{ projectId, section }, cookieStore] = await Promise.all([
    params,
    cookies()
  ]);
  const currentUser = await getAuthSessionUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value
  );

  if (!currentUser) {
    redirect("/");
  }

  if (section === "calendar") {
    redirect(`/projects/${projectId}/schedule`);
  }

  if (!projectPages.has(section as ProjectPageKey)) {
    redirect(`/projects/${projectId}/info`);
  }

  return (
    <ProjectWorkspace
      currentUser={currentUser}
      initialProjectId={decodeURIComponent(projectId)}
      projectPage={section as ProjectPageKey}
      view="project"
    />
  );
}
