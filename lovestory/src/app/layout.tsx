import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LoveStoryProvider } from "@/context/LoveStoryContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#ff4b82",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "LoveStory",
  description: "Không gian lưu giữ kỷ niệm tình yêu của hai người",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "LoveStory",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff', borderRadius: '10px' } }} />
        <LoveStoryProvider>
          {children}
        </LoveStoryProvider>
      </body>
    </html>
  );
}
