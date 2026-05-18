import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrainC+",
  icons: {
    icon: "/images/entreno-logo.png",
    shortcut: "/images/entreno-logo.png",
    apple: "/images/entreno-logo.png",
  },
  appleWebApp: {
    title: "TrainC+",
    capable: true,
    statusBarStyle: "default",
  },
};

export default function EntrenoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}