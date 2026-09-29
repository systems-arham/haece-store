import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { getContent } from "@/lib/db";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["italic", "normal"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HAECE, Considered Clothing",
  description: "Premium founder wear. Designed slowly, made properly, shipped worldwide.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const isAdmin = h.get("x-admin") === "1";
  let announcement = "";
  if (!isAdmin) {
    try {
      announcement = await getContent("announcement", "");
    } catch {
      announcement = "";
    }
  }
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable}`}>
        {isAdmin ? (
          <>{children}</>
        ) : (
          <CartProvider>
            <Header announcement={announcement} />
            <main>{children}</main>
            <Footer />
          </CartProvider>
        )}
      </body>
    </html>
  );
}
