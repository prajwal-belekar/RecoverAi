export default function AIInsightsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            AI Root Cause Analysis & Recurring Issues
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Automated issue pattern recognition and corrective action recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-white">
                Payment Gateway Error (ERR_PAYMENT_FAILED)
              </span>
              <span className="rounded-full bg-red-100 text-red-800 text-xs px-3 py-1 font-semibold">
                Critical Pattern
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 dark:text-gray-300">
              <p>
                <strong className="text-zinc-900 dark:text-white">Affected Customers:</strong> 14 customers in the last 24 hours
              </p>

              <p>
                <strong className="text-zinc-900 dark:text-white">Observed Pattern:</strong> Spikes in payment failures specifically during credit card checkout using European billing addresses.
              </p>

              <p>
                <strong className="text-zinc-900 dark:text-white">Hypothesized Root Cause:</strong> Recent 3D Secure 2.0 update on the payment gateway provider side rejecting non-EU card checks.
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-md p-3 border border-amber-200 dark:border-amber-800 text-xs">
                <strong className="text-amber-800 dark:text-amber-300 block mb-1">Recommended Action:</strong>
                Temporary fallback configuration for 3DS verification rules on Stripe settings page, and update customer support response templates.
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-white">
                Password Reset Link Expiration
              </span>
              <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-3 py-1 font-semibold">
                Moderate Pattern
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 dark:text-gray-300">
              <p>
                <strong className="text-zinc-900 dark:text-white">Affected Customers:</strong> 8 customers in the last 48 hours
              </p>

              <p>
                <strong className="text-zinc-900 dark:text-white">Observed Pattern:</strong> Customers requesting multiple password reset links within short intervals.
              </p>

              <p>
                <strong className="text-zinc-900 dark:text-white">Hypothesized Root Cause:</strong> 15-minute expiration time is too short for emails delayed by corporate spam filters.
              </p>

              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-md p-3 border border-indigo-200 dark:border-indigo-800 text-xs">
                <strong className="text-indigo-800 dark:text-indigo-300 block mb-1">Recommended Action:</strong>
                Extend password reset link validity window from 15 minutes to 1 hour in auth system settings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}