export default function TicketInboxPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex gap-4 mb-6">
        <button
          className="flex items-center gap-2 rounded-md bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-200 transition-colors"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
          </svg>
          New Ticket
        </button>

        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-zinc-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
          </svg>
          Filter:
          <select
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <option>All Tickets</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Ticket cards will be rendered here */}
        <div
          className="rounded-lg border border-border bg-white dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Ticket #1234: Payment failure
              </h3>
              <p className="text-zinc-500 dark:text-gray-300 text-sm mt-0.5">
                Customer reported payment not processing on checkout
              </p>
            </div>
            <span className="rounded-md bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5">
              High
            </span>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-white dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Ticket #1235: Technical issue
              </h3>
              <p className="text-zinc-500 dark:text-gray-300 text-sm mt-0.5">
                Application crashing on login attempt
              </p>
            </div>
            <span className="rounded-md bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5">
              Medium
            </span>
          </div>
        </div>

        <div
          className="rounded-lg border border-border bg-white dark:bg-gray-800 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Ticket #1236: Account access
              </h3>
              <p className="text-zinc-500 dark:text-gray-300 text-sm mt-0.5">
                Unable to reset password
              </p>
            </div>
            <span className="rounded-md bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5">
              Low
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}