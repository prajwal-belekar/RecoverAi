export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Company Knowledge Base & RAG Documents
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Upload documentation, FAQs, and procedures to ground AI responses in real company data
            </p>
          </div>

          <button className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500">
            Upload Document
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center bg-white dark:bg-gray-800">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="mt-2 block text-sm font-medium text-zinc-900 dark:text-white">
            Drop PDF, TXT, or DOCX files here to index for AI retrieval
          </span>
          <span className="mt-1 block text-xs text-zinc-500">
            Files are chunked and converted to embeddings automatically
          </span>
        </div>

        <div className="rounded-lg border border-border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-gray-300">Document Title</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-gray-300">Source Type</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-gray-300">Chunks Indexed</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-gray-300">Created Date</th>
                <th className="px-6 py-3 text-right font-medium text-zinc-500 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">Payment Troubleshooting Guide v2.pdf</td>
                <td className="px-6 py-4 text-zinc-500">Troubleshooting Guide</td>
                <td className="px-6 py-4 text-zinc-500">12 chunks</td>
                <td className="px-6 py-4 text-zinc-500">Oct 28, 2026</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">Customer Refund Policy 2026.docx</td>
                <td className="px-6 py-4 text-zinc-500">Policy</td>
                <td className="px-6 py-4 text-zinc-500">8 chunks</td>
                <td className="px-6 py-4 text-zinc-500">Oct 15, 2026</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}