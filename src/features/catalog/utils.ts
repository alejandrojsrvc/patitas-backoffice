import type { AnalyticalCompositionItem, Product, FulfillmentStatus, Variant } from "../../types";

export const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const imageFileError = (file: File) =>
  !allowedImageTypes.has(file.type)
    ? "El archivo debe ser JPEG, PNG, WebP o GIF."
    : file.size > 10 * 1024 * 1024
      ? "La imagen no puede superar los 10 MB."
      : null;
export const formatPresentation = (
  presentation: string | null,
  weightGrams?: number | null,
) => {
  const raw = presentation || (weightGrams ? `${weightGrams} g` : "");
  const match = raw.trim().match(/^(\d+)\s*g$/i);
  if (!match) return raw || "Sin presentación";
  const grams = Number(match[1]);
  return grams >= 1000
    ? `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(grams / 1000)} kg`
    : `${grams} g`;
};
export const fulfillmentStatus = (variant: Variant): FulfillmentStatus => {
  if (Number(variant.availableQuantity || 0) > 0) return "IN_STOCK";
  if (
    ["AVAILABLE", "ON_REQUEST"].includes(variant.supplierStockStatus || "") &&
    variant.supplierLeadTimeHours !== null &&
    variant.supplierLeadTimeHours !== undefined
  )
    return "ON_REQUEST";
  return "OUT_OF_STOCK";
};
export const compositionRows = (
  value: Product["analyticalComposition"],
): AnalyticalCompositionItem[] => {
  if (Array.isArray(value))
    return value.map((item) => ({
      name: item.name || "",
      minimum: String(item.minimum ?? ""),
      maximum: String(item.maximum ?? ""),
      unit: item.unit || "",
      rawValue: item.rawValue || "",
    }));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([name, item]) => {
    const entry =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : { minimum: item };
    return {
      name,
      minimum: String(entry.minimum ?? ""),
      maximum: String(entry.maximum ?? ""),
      unit: String(entry.unit ?? "%"),
      rawValue: String(entry.rawValue ?? ""),
    };
  });
};
export const compositionPayload = (
  rows: AnalyticalCompositionItem[],
): Record<string, unknown> =>
  Object.fromEntries(
    rows
      .filter((row) => row.name.trim())
      .map((row) => [
        row.name.trim(),
        {
          minimum: row.minimum || null,
          maximum: row.maximum || null,
          unit: row.unit || null,
          rawValue: row.rawValue || null,
        },
      ]),
  );
