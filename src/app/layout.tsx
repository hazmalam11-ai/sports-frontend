import type { Metadata } from "next";
import { Inter, Roboto, Poppins, Oswald } from "next/font/google";
import "./globals.css";
import FooterGate from "@/components/FooterGate";
import AuthWrapper from "@/components/AuthWrapper";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Primary font for body text - clean and readable
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Secondary font for headings - modern and bold
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

// Accent font for special elements - stylish and sporty
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Display font for large headings - strong and impactful
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mal'abak - Your Football Stadium",
  description: "All football news and matches in one place",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${roboto.variable} ${poppins.variable} ${oswald.variable} antialiased dark`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AuthWrapper>
              {children}
              <FooterGate />
            </AuthWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
