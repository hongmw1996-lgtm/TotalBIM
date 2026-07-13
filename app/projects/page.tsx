import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";
import { AUTH_COOKIE_NAME } from "@/lib/auth/adminAuth";
import { getAuthSessionUser } from "@/lib/auth/session";

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const currentUser = await getAuthSessionUser(
    cookieStore.get(AUTH_COOKIE_NAME)?.value
  );

  if (!currentUser) {
    redirect("/");
  }

  return <ProjectWorkspace currentUser={currentUser} view="home" />;
}
