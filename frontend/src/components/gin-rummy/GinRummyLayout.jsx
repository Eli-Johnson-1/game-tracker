export function GinRummyLayout({ children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a2e22' }}>
      {/* Felt texture header strip */}
      <div
        className="border-b px-4 py-4"
        style={{ backgroundColor: '#1e3d2f', borderColor: '#2d5a40' }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Gin Rummy
            </h1>
            <p className="text-xs" style={{ color: '#7ab893' }}>♥ ♦ ♣ ♠ — Family Score Tracker</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
