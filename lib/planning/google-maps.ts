export type RouteStop = {
  addressLine: string;
  postalCode?: string | null;
  city?: string | null;
};

const stopAddress = (stop: RouteStop) => [stop.addressLine, stop.postalCode, stop.city]
  .map((part) => String(part || "").trim())
  .filter(Boolean)
  .join(", ");

// Mobile Google Maps accepts three intermediate waypoints. Leaving origin out
// lets Google Maps use the driver's current location, so every chunk contains
// up to four customer stops and stays usable on phone and desktop.
export const googleMapsRouteLinks = (stops: RouteStop[]) => {
  const usableStops = stops.filter((stop) => Boolean(stopAddress(stop)));
  const chunks: RouteStop[][] = [];
  for (let index = 0; index < usableStops.length; index += 4) chunks.push(usableStops.slice(index, index + 4));

  return chunks.map((chunk, index) => {
    const params = new URLSearchParams({
      api: "1",
      destination: stopAddress(chunk[chunk.length - 1]),
      travelmode: "driving",
    });
    if (chunk.length > 1) params.set("waypoints", chunk.slice(0, -1).map(stopAddress).join("|"));
    return { href: `https://www.google.com/maps/dir/?${params.toString()}`, part: index + 1, stopCount: chunk.length };
  });
};
