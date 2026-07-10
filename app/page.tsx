export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Develop. Preview. Review.</div>
        <h1 className="title">IFC workflows for production review.</h1>
        <p className="muted">로그인 회원가입</p>
        <div className="grid">
          <div className="card">
            <h3>Account Access</h3>
            <p className="muted">로그인</p>
            <p className="muted">아이디 비밀번호 로그인</p>
          </div>
          <div className="card">
            <h3>Projects</h3>
            <p className="muted">업로드, 모델 처리, 뷰어 열람 흐름을 유지합니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
