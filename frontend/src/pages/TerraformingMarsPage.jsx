export function TerraformingMarsPage() {
  return (
    <div
      className="min-h-[60vh] rounded-2xl flex flex-col items-center justify-center text-center p-8"
      style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)' }}
    >
      <div className="text-8xl mb-6">🪐</div>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#e8824a' }}>
        Terraforming Mars
      </h1>
      <p className="text-orange-200/70 max-w-md text-sm leading-relaxed">
        Score tracking for Terraforming Mars is coming soon. For now, keep playing
        and we'll build the scoreboard when you're ready.
      </p>
      <div className="mt-8 flex gap-2 text-orange-900/50 text-xs">
        <span>TR</span><span>·</span><span>Milestones</span><span>·</span>
        <span>Awards</span><span>·</span><span>Greenery</span><span>·</span><span>Cities</span>
      </div>
    </div>
  )
}
