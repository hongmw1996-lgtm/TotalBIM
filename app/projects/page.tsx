const items = ['Active projects', 'Model processing', 'Viewer sessions'];

export default function ProjectsPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Projects</div>
        <h1 className="title">Project dashboard</h1>
        <p className="muted">업무용 BIM 프로젝트를 모아 보고, 업로드와 처리 상태를 추적합니다.</p>
        <div className="grid">
          {items.map((item) => (
            <div key={item} className="card">
              <h3>{item}</h3>
              <p className="muted">상태 표시용 플레이스홀더입니다.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
