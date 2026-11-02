export const instant = false;

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Ticket #{id}
          </h1>

          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5">
              Open
            </span>
            <span className="rounded-md bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5">
              High Priority
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Payment Processing Error
          </h2>

          <div className="flex items-center justify-between text-sm text-zinc-500 border-b pb-4">
            <div>
              <span>Customer: </span>
              <span className="font-medium text-zinc-900 dark:text-white">
                Jane Smith
              </span>
            </div>

            <div>
              <span>Email: </span>
              <span className="font-medium text-zinc-900 dark:text-white">
                jane@example.com
              </span>
            </div>

            <div>
              <span>Created: </span>
              <span className="font-medium text-zinc-900 dark:text-white">
                2 hours ago
              </span>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-gray-300">
            I&apos;ve been trying to process payment for my order for the past hour,
            and every time I enter my card details and click submit, the page
            refreshes with a generic error code &apos;ERR_PAYMENT_FAILED&apos;. I&apos;ve tried
            two different credit cards and getting the same error.
          </p>

          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 space-y-2 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">
                AI Classification Result
              </span>
              <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">
                98% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-zinc-500 dark:text-gray-400">Category:</span>
                <span className="font-medium text-zinc-900 dark:text-white block">
                  Billing & Payment
                </span>
              </div>

              <div>
                <span className="text-zinc-500 dark:text-gray-400">Urgency:</span>
                <span className="font-medium text-red-600 dark:text-red-400 block">
                  Critical
                </span>
              </div>

              <div>
                <span className="text-zinc-500 dark:text-gray-400">Sentiment:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400 block">
                  Frustrated
                </span>
              </div>

              <div>
                <span className="text-zinc-500 dark:text-gray-400">Department:</span>
                <span className="font-medium text-zinc-900 dark:text-white block">
                  Finance Support
                </span>
              </div>
            </div>

            <div className="mt-2 text-xs text-zinc-600 dark:text-gray-300">
              <span className="font-semibold text-zinc-700 dark:text-gray-200">Suggested Action: </span>
              Escalate to Payment Gateway Technical Team. Verify Stripe gateway logs for transaction attempts from customer email.
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            AI Suggested Response
          </h3>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 text-sm text-zinc-700 dark:text-gray-200 space-y-2">
            <p>
              Hi Jane,
            </p>
            <p>
              Thank you for reaching out to us. I sincerely apologize for the inconvenience you&apos;ve experienced with our payment processing system.
            </p>
            <p>
              We are currently investigating a temporary issue with our primary payment gateway that affected credit card transactions over the last two hours. Our engineering team has deployed a fix, and transactions are now processing normally.
            </p>
            <p>
              Could you please try completing your transaction again? If you continue to see any errors, please let us know immediately so we can assist you directly.
            </p>
            <p>Best regards,<br />Customer Support Team</p>
          </div>

          <div className="flex gap-3 justify-end">
            <button className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
              Edit Response
            </button>
            <button className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-500">
              Approve & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}