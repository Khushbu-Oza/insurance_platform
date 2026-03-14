import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsureFlow | Cloud-Native P&C Insurance Core Platform",
  description:
    "InsureFlow is a modern cloud-native core platform for regional P&C carriers and MGAs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
