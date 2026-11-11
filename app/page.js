export default function Home() {
  return (
    <main className="wrap" style={{ paddingTop: 60 }}>
      <div className="card center">
        <div className="muted">TechIngen Solutions</div>
        <h1 style={{ marginTop: 6 }}>Catalogue &amp; Order Book</h1>
        <p className="muted">Each brand opens its own catalogue from its unique link.</p>
        <a className="btn" href="/admin">Master admin</a>
      </div>
    </main>
  );
}
