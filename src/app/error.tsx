'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
