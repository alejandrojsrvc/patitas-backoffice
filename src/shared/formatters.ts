export const money = (value: string | number | null | undefined) =>
  value == null || value === ""
    ? "—"
    : new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }).format(Number(value));

export const percentage = (value: number | null) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : `${value.toFixed(1).replace(".", ",")}%`;

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
