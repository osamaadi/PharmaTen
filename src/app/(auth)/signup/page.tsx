"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type SignupFormState } from "./actions";
import { equipmentCategoryLabels } from "@/lib/tender-spec";

const initialState: SignupFormState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>;
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<"MANUFACTURER" | "SUPPLIER">("MANUFACTURER");

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-gray-600">
        Your company will be reviewed by our team before it can participate in
        tenders.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium">I am a…</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                ["MANUFACTURER", "Manufacturer", "I post equipment tenders"],
                ["SUPPLIER", "Supplier", "I bid on equipment tenders"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  role === value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="mr-2"
                />
                <span className="font-medium">{label}</span>
                <span className="mt-1 block text-xs text-gray-500">{hint}</span>
              </label>
            ))}
          </div>
          <FieldError messages={state.fieldErrors?.role} />
        </fieldset>

        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Your name
          </label>
          <input id="name" name="name" className={inputClass} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Work email
          </label>
          <input id="email" name="email" type="email" className={inputClass} required />
          <FieldError messages={state.fieldErrors?.email} />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            className={inputClass}
            required
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="companyName">
            Company name
          </label>
          <input id="companyName" name="companyName" className={inputClass} required />
          <FieldError messages={state.fieldErrors?.companyName} />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="country">
            Country
          </label>
          <input id="country" name="country" className={inputClass} required />
          <FieldError messages={state.fieldErrors?.country} />
        </div>

        {role === "SUPPLIER" && (
          <fieldset>
            <legend className="text-sm font-medium">
              Equipment categories you supply
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(equipmentCategoryLabels).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="categories" value={value} />
                  {label}
                </label>
              ))}
            </div>
            <FieldError messages={state.fieldErrors?.categories} />
          </fieldset>
        )}

        {state.error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
