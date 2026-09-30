import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Splash from "@/components/Splash";
import { introBootScript } from "@/lib/intro";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LANG, LANG_COOKIE, htmlLang, isLang, isRtl } from "@/lib/i18n/config";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Flixi Tawsil — فليكسي توصيل",
  description: "Transport de marchandises partout en Algérie · نقل السلع في كامل الجزائر",
};
export const viewport: Viewport = { themeColor: "#ff2e7e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(c) ? c : DEFAULT_LANG;
  return (
    <html lang={htmlLang(lang)} dir={isRtl(lang) ? "rtl" : "ltr"} className={`${jakarta.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      </head>
      <body>
        <I18nProvider initial={lang}>
          <Splash />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
