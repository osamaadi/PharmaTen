import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TenderForm } from "./tender-form";

export default async function NewTenderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // UI-level gate only — createTender re-checks the role against the DB.
  if (session.user.role !== "MANUFACTURER") redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Create a tender</h1>
      <p className="mt-1 text-sm text-gray-600">
        Describe the equipment you need. Verified suppliers in this category
        will be able to submit structured bids.
      </p>
      <TenderForm />
    </main>
  );
}
