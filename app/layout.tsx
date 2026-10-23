import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Add an employee | People",
  description: "Create an employee profile for your organization.",
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
