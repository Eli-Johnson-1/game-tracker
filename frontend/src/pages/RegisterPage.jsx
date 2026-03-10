import { RegisterForm } from '../components/auth/RegisterForm'

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎲</div>
          <h1 className="text-2xl font-bold text-white">Game Tracker</h1>
          <p className="text-gray-400 mt-1 text-sm">Create your family account</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Create account</h2>
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
