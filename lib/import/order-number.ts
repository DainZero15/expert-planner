const orderNumberKey = (value: string) => value
  .toLocaleLowerCase("nl-NL")
  .replace(/[^a-z0-9]/g, "");

export const normalizedOrderNumber = (value: string) => orderNumberKey(value);
