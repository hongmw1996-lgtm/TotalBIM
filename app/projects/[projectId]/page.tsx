type Params = Promise<{ projectId: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectId } = await params;

  return (
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">Project</div>
        <h1 className="title">Project {projectId}</h1>
        <p className="muted">프로젝트 상세 페이지입니다.</p>
      </section>
    </main>
  );
}
