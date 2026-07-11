import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const verificationCopy = {
  PENDING: {
    style: "bg-amber-50 text-amber-800 border-amber-200",
    text: "Your company is pending verification. You can browse, but tender actions unlock once our team approves your documents.",
  },
  APPROVED: {
    style: "bg-green-50 text-green-800 border-green-200",
    text: "Your company is verified.",
  },
  REJECTED: {
    style: "bg-red-50 text-red-800 border-red-200",
    text: "Your company verification was rejected. Please contact support.",
  },
} as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Read fresh state from the DB — verification status may have changed
  // since the JWT was issued.
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });
  if (!company) redirect("/login");

  const banner = verificationCopy[company.verificationStatus];
  const isManufacturer = session.user.role === "MANUFACTURER";

  const tenders = isManufacturer
    ? await prisma.tender.findMany({
        where: { companyId: company.id },
        include: { currentVersion: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {company.name}
            <span className="ml-3 align-middle rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {session.user.role === "MANUFACTURER" ? "Manufacturer" : "Supplier"}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Signed in as {session.user.name} ({session.user.email})
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            Sign out
          </button>
        </form>
      </div>

      <div className={`mt-6 rounded-md border p-4 text-sm ${banner.style}`}>
        {banner.text}
      </div>

      {isManufacturer && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Your tenders</h2>
            <Link
              href="/tenders/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create tender
            </Link>
          </div>
          {tenders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No tenders yet. Create your first tender to start receiving bids.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
              {tenders.map((t) => {
                const spec = t.currentVersion?.specJson as {
                  capacity?: string;
                } | null;
                return (
                  <li key={t.id} className="p-4 text-sm">
                    <span className="font-medium">
                      {t.category.replaceAll("_", " ")}
                    </span>
                    {spec?.capacity && (
                      <span className="text-gray-600"> — {spec.capacity}</span>
                    )}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                      {t.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      v{t.currentVersion?.versionNumber ?? 1} ·{" "}
                      {t.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {!isManufacturer && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Open tenders</h2>
          <p className="mt-4 text-sm text-gray-500">
            Tender browsing and bidding are coming in the next release.
          </p>
        </section>
      )}
    </main>
  );
}
