export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-indigo-100 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-indigo-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="text-indigo-900 font-semibold text-lg">ResolveAI</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-zinc-600 text-sm">
            Welcome back!
          </span>
        </div>
      </nav>

      <main className="p-6 flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Dashboard stats cards will go here */}
        </div>
      </main>
    </div>
  );
}