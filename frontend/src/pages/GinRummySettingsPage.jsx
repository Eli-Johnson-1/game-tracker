import { Link } from 'react-router-dom'
import { GinRummyLayout } from '../components/gin-rummy/GinRummyLayout'
import { SettingsPanel } from '../components/settings/SettingsPanel'

export function GinRummySettingsPage() {
  return (
    <GinRummyLayout>
      <Link
        to="/gin-rummy"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
        style={{ color: '#7ab893' }}
      >
        ← Back
      </Link>
      <h2 className="text-white font-semibold text-lg mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        Scoring Settings
      </h2>
      <SettingsPanel />
    </GinRummyLayout>
  )
}
