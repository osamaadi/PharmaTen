import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">PharmaTen</h1>
      <p className="mt-4 text-lg text-gray-600">
        Structured equipment tenders for pharmaceutical manufacturers — comparable,
        verified bids from global suppliers in one place.
      </p>
      <div className="mt-8 flex gap-4">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
