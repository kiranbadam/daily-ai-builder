import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboDevLoop — Your repos drive themselves",
  description:
    "The autonomous dev loop that analyzes, builds, tests, and ships features to your repos — every single day. One command: npx robodevloop",
  openGraph: {
    title: "RoboDevLoop — Your repos drive themselves",
    description: "The autonomous dev loop that analyzes, builds, tests, and ships features to your repos — every single day.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RoboDevLoop — Your repos drive themselves",
    description: "The autonomous dev loop that analyzes, builds, tests, and ships features to your repos — every single day.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
