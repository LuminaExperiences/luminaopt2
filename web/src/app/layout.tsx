import type { Metadata } from "next";
import { Geist, Geist_Mono, Inria_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inriaSerif = Inria_Serif({
  variable: "--font-inria-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Lumina - The Big Fake Indian Wedding",
  description: "Let the parties begin. Join us for an immersive cultural experience at The Big Fake Indian Wedding.",
  keywords: ["Lumina", "Indian Wedding", "Cultural Experience", "Party", "Event"],
  authors: [{ name: "Lumina Experiences" }],
  creator: "Lumina Experiences",
  publisher: "Lumina Experiences",
  
  // Open Graph metadata for social sharing
  openGraph: {
    title: "Lumina - The Big Fake Indian Wedding",
    description: "Let the parties begin. Join us for an immersive cultural experience at The Big Fake Indian Wedding.",
    url: "https://luminaexperiences.net",
    siteName: "Lumina Experiences",
    images: [
      {
        url: "/Frame 1.png", // Primary logo for social sharing
        width: 1200,
        height: 630,
        alt: "Lumina Experiences Logo",
      },
      {
        url: "/newlogowhite.png", // Alternative logo
        width: 800,
        height: 600,
        alt: "Lumina Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Lumina - The Big Fake Indian Wedding",
    description: "Let the parties begin. Join us for an immersive cultural experience.",
    images: ["/Frame 1.png"],
    creator: "@lumina.wa",
  },
  
  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification and other meta tags
  verification: {
    // Add your verification codes here if needed
    // google: "your-google-verification-code",
  },
  
  // App-specific metadata
  applicationName: "Lumina Experiences",
  category: "Entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${inriaSerif.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}>
        {children}
      </body>
    </html>
  );
}
