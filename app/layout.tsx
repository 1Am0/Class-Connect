import type { Metadata } from "next";
import "@fontsource-variable/google-sans-flex";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/overlays.css";
import "./styles/shell.css";
import "./styles/home.css";
import "./styles/attendance.css";
import "./styles/history.css";
import "./styles/activities.css";
import "./styles/scanner.css";
import "./styles/settings.css";
import "./styles/help.css";
import "./styles/auth.css";
import { BluetoothProvider } from "@/components/bluetooth-provider";
import { PreferencesProvider } from "@/components/preferences";
import { I18nProvider } from "@/components/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Class Connect",
    description: (await getT("common"))("siteDescription"),
    icons: { icon: "/favicon.svg" },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const p=JSON.parse(localStorage.getItem('classroom-preferences-v1')||'{}');document.documentElement.dataset.theme=p.theme==='dark'||(p.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch{}`,
          }}
        />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <PreferencesProvider>
            <BluetoothProvider>{children}</BluetoothProvider>
          </PreferencesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
