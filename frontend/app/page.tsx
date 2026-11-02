export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 py-12">
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
        <h1 className="text-5xl font-bold text-indigo-900 mb-2">
          ResolveAI
        </h1>
        <p className="text-zinc-600 text-lg max-w-xl mb-8">
          Transform customer support from a manual process into an intelligent,
          data-driven workflow. Identify issues faster, resolve them efficiently,
          and improve customer satisfaction with AI-assisted support.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
          <a
            href="/auth/login"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-8 text-indigo-600 font-medium shadow-sm hover:bg-indigo-50 transition-colors"
          >
            <svg
              className="dark:invert h-[16px] w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18 8h-1V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H3a1 1 0 1 0-1 1v6a1 1 0 1 0 2 0v-2h1l5 5 5-5h-2zm4 8c-.97 0-1.73-.77-1.73-1.73s.76-1.73 1.73-1.73 1.73.77 1.73 1.73-.76 1.73-1.73 1.73zM9 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10C6.48 5 5 6.48 5 8s1.48 3 3 3 3-1.48 3-3-1.48-3-3-3z" />
            </svg>
            Log In
          </a>

          <a
            href="/auth/register"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white px-8 text-white font-medium transition-colors hover:bg-opacity-10"
          >
            <svg
              className="dark:invert h-[16px] w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
            </svg>
            Sign Up
          </a>
        </div>
      </div>
    </main>
  );
}