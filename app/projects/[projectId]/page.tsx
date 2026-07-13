import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";
import { AUTH_COOKIE_NAME } from "@/lib/auth/adminAuth";
import { getAuthSessionUser } from "@/lib/auth/session";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const [{ projectId }, cookieStore] = await Promise.all([params, cookies()]);
  const currentUser = await getAuthSessionUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value
  );

  if (!currentUser) {
    redirect("/");
  }

  return (
    <ProjectWorkspace
      currentUser={currentUser}
      initialProjectId={decodeURIComponent(projectId)}
      projectPage="info"
      view="project"
    />
  );
}
