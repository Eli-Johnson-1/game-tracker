export function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-red-200 text-sm">
      {message}
    </div>
  )
}
