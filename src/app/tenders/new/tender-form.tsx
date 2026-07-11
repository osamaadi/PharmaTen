"use client";

import { useActionState } from "react";
import {
  complianceStandardLabels,
  equipmentCategoryLabels,
} from "@/lib/tender-spec";
import { createTenderAction, type CreateTenderFormState } from "./actions";

const initialState: CreateTenderFormState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>;
}

export function TenderForm() {
  const [state, formAction, pending] = useActionState(
    createTenderAction,
    initialState,
  );

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label className="block text-sm font-medium" htmlFor="category">
          Equipment category
        </label>
        <select id="category" name="category" className={inputClass} required>
          <option value="">Select a category…</option>
          {Object.entries(equipmentCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.category} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="capacity">
          Capacity / output
        </label>
        <input
          id="capacity"
          name="capacity"
          placeholder="e.g. 50,000 tablets/hour"
          className={inputClass}
          required
        />
        <FieldError messages={state.fieldErrors?.capacity} />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
          htmlFor="complianceStandard"
        >
          Required compliance standard
        </label>
        <select
          id="complianceStandard"
          name="complianceStandard"
          className={inputClass}
          required
        >
          <option value="">Select a standard…</option>
          {Object.entries(complianceStandardLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.complianceStandard} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="timeline">
          Timeline
        </label>
        <input
          id="timeline"
          name="timeline"
          placeholder="e.g. delivery and installation within 6 months"
          className={inputClass}
          required
        />
        <FieldError messages={state.fieldErrors?.timeline} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="visibility">
          Visibility
        </label>
        <select id="visibility" name="visibility" className={inputClass}>
          <option value="OPEN">Open to all verified suppliers in category</option>
          <option value="INVITE_ONLY">Invite-only</option>
        </select>
        <FieldError messages={state.fieldErrors?.visibility} />
      </div>

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
        {pending ? "Creating tender…" : "Create tender"}
      </button>
    </form>
  );
}
