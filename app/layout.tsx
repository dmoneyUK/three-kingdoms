import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Three Realms — Classic Hidden-Role Card Game",
  description: "A private online strategy card game for friends, inspired by the Three Kingdoms era.",
  metadataBase: new URL("https://three-realms-table.dai-jinge.chatgpt.site"),
  openGraph: {
    title: "Three Realms",
    description: "Gather 4–8 friends for a classic hidden-role strategy game.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Three Realms game table" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Three Realms",
    description: "Gather 4–8 friends for a classic hidden-role strategy game.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
