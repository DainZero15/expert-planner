export type CustomerForDuplicateCheck = {
  id: string;
  customer_number: string | null;
  name: string;
  address_line: string;
  postal_code: string | null;
  city: string | null;
  phone?: string | null;
  email?: string | null;
};

const normalize = (value: string | null | undefined) => String(value || "")
  .trim()
  .toLocaleLowerCase("nl-NL")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ");

export const customerAddress = (customer: CustomerForDuplicateCheck) =>
  [customer.address_line, customer.postal_code, customer.city].filter(Boolean).join(", ");

export function splitDuplicates<T extends CustomerForDuplicateCheck>(customers: T[]) {
  const grouped = new Map<string, T[]>();
  for (const customer of customers) {
    const key = [customer.name, customer.address_line, customer.postal_code, customer.city]
      .map(normalize)
      .join("|");
    grouped.set(key, [...(grouped.get(key) || []), customer]);
  }
  const duplicates = [...grouped.values()].filter((group) => group.length > 1);
  const duplicateIds = new Set(duplicates.flatMap((group) => group.map((customer) => customer.id)));
  return { regular: customers.filter((customer) => !duplicateIds.has(customer.id)), duplicates, duplicateRows: duplicateIds.size };
}
