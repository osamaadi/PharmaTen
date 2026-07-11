import { z } from "zod";
import { ComplianceStandard, EquipmentCategory } from "@/generated/prisma/enums";

// TenderSpec (PRD Section 9): the structured, per-category spec fields stored
// in TenderVersion.spec_json. Validated on every write so spec_json is never
// free-form. MVP form covers PRD 6.1 step 2: capacity, compliance standard,
// timeline (+ optional utilities / budget range already in the shape so
// amendments don't need a schema change).
export const tenderSpecSchema = z.object({
  // e.g. "50,000 tablets/hour" — free text for MVP since units differ per
  // equipment category.
  capacity: z.string().trim().min(1, "Capacity is required").max(500),
  complianceStandard: z.enum(ComplianceStandard, {
    error: "Select a compliance standard",
  }),
  // Required delivery/installation timeline, e.g. "Delivery within 6 months".
  timeline: z.string().trim().min(1, "Timeline is required").max(500),
  utilityRequirements: z.string().trim().max(2000).optional(),
  budgetRange: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
      currency: z.string().length(3),
    })
    .optional(),
});

export type TenderSpec = z.infer<typeof tenderSpecSchema>;

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  TABLET_PRESS: "Tablet press",
  CAPSULE_FILLER: "Capsule filler",
  BLISTER_PACKER: "Blister packer",
  GRANULATION_EQUIPMENT: "Granulation equipment",
  OTHER_MACHINERY: "Other machinery",
};

export const complianceStandardLabels: Record<ComplianceStandard, string> = {
  GMP: "GMP",
  EU_GMP: "EU GMP",
  FDA: "FDA",
  WHO: "WHO",
};
