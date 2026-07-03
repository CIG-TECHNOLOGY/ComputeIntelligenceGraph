import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">CIG Monitor</h1>
        <p className="mb-8 text-sm text-gray-500">
          Sign in with your CIG or organization account.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Continue with CIG SSO
          </button>
        </form>
      </div>
    </main>
  );
}
