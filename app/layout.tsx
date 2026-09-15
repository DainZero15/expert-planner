import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Expert Planner", description: "Bezoekplanning voor experts" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl"><body>{children}</body></html>;
}
