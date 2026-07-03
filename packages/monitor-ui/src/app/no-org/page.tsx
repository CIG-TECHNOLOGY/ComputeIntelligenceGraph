export default function NoOrgPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-sm rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-gray-900">No organization found</h1>
        <p className="mb-6 text-sm text-gray-500">
          Your account isn&apos;t linked to an organization yet. Contact CIG to get set up.
        </p>
        <a
          href="mailto:admin@cig.technology"
          className="text-sm text-indigo-600 hover:underline"
        >
          admin@cig.technology
        </a>
      </div>
    </main>
  );
}
