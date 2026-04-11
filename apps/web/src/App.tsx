export default function App() {
  return (
    <div className="min-h-screen bg-pace-bg text-pace-text transition-colors duration-300">
      <header className="border-b border-pace-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl tracking-tight">SDR</h1>
          <span className="text-sm text-pace-text-muted font-mono">v0.1.0</span>
        </div>
        <p className="text-sm text-pace-text-secondary mt-1">
          Split Deviation Rating — Collegiate Track & Field
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <section className="bg-pace-card border border-pace-border rounded-lg shadow-pace p-6">
          <h2 className="font-display text-xl mb-4">Leaderboard</h2>
          <p className="text-pace-text-secondary">
            Pipeline not yet connected. Run passes 2–5 to populate ratings.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {["800m", "1500m", "5000m"].map((event) => (
              <div
                key={event}
                className="bg-pace-card-inner rounded-lg p-4 border border-pace-border-subtle"
              >
                <span className="font-mono text-sm text-pace-accent">{event}</span>
                <p className="text-pace-text-muted text-xs mt-1">No data</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
