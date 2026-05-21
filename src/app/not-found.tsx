export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Page not found
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-block text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
