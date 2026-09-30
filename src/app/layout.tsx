import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Splash from "@/components/Splash";
import { introBootScript } from "@/lib/intro";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Flixi Tawsil — Transport de marchandises partout en Algérie",
  description: "Publiez votre marchandise, recevez les meilleures offres des transporteurs et suivez votre livraison en direct, dans les 58 wilayas.",
};
export const viewport: Viewport = { themeColor: "#ff2e7e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      </head>
      <body>
        <Splash />
        {children}
      </body>
    </html>
  );
}
