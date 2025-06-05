import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Explain Like I'm - AI-Powered Simple Explanations",
  description: "Get complex topics explained in simple terms, tailored to your level of understanding. Perfect for learning new concepts or teaching others.",
  keywords: ["explain", "learn", "AI", "education", "simple explanations", "teaching"],
  authors: [{ name: "Explain Like I'm" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
