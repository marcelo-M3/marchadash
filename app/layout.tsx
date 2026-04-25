import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saúde de Clientes — Marcha Ads",
  description: "Dashboard interno para acompanhamento da carteira de clientes da Marcha Ads."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="dark">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem("marcha-theme");
                  var theme = saved === "light" || saved === "dark" ? saved : "dark";
                  document.documentElement.setAttribute("data-theme", theme);
                } catch (e) {
                  document.documentElement.setAttribute("data-theme", "dark");
                }
              })();
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
