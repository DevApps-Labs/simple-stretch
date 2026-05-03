import "./globals.css";
import SWInit from "@/components/SWInit";

export const metadata = {
  title: "Simple Stretch",
  description: "Guided stretch timer with customizable routines",
  applicationName: "Simple Stretch",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stretch",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="h-full bg-neutral-950 text-white antialiased">
        <SWInit />
        {children}
      </body>
    </html>
  );
}
