type Params = Promise<{ projectId: string; section: string }>;

export default async function ProjectSectionPage({ params }: { params: Params }) {
  const { projectId, section } = await params;

  return (
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">Project Section</div>
        <h1 className="title">
          {projectId} / {section}
        </h1>
        <p className="muted">섹션별 상세 페이지입니다.</p>
      </section>
    </main>
  );
}
