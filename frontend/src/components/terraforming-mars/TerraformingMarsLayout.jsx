export function TerraformingMarsLayout({ children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a0800' }}>
      {/* Mars-themed header strip */}
      <div
        className="border-b px-4 py-4"
        style={{ backgroundColor: '#2d1000', borderColor: '#7c2d12' }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🪐</span>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Terraforming Mars
            </h1>
            <p className="text-xs" style={{ color: '#f97316' }}>TR · Milestones · Awards · Greenery · Cities</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
