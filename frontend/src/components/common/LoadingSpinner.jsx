export function LoadingSpinner({ className = 'h-8 w-8' }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${className}`} />
  )
}
