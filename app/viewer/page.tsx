import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";
import { AUTH_COOKIE_NAME } from "@/lib/auth/adminAuth";
import { getAuthSessionUser } from "@/lib/auth/session";

type ViewerPageProps = {
  searchParams: Promise<{
    projectId?: string;
  }>;
};

export default async function ViewerPage({ searchParams }: ViewerPageProps) {
  const [resolvedSearchParams, cookieStore] = await Promise.all([
    searchParams,
    cookies()
  ]);
  const currentUser = await getAuthSessionUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value
  );

  if (!currentUser) {
    redirect("/");
  }

  return (
    <ProjectWorkspace
      currentUser={currentUser}
      initialProjectId={
        resolvedSearchParams.projectId
          ? decodeURIComponent(resolvedSearchParams.projectId)
          : undefined
      }
      view="viewer"
    />
  );
}
