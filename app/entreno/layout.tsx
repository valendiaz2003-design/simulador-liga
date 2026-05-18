import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrainC+",
  icons: {
    icon: "/images/entreno-logo.png?v=trainc8",
    shortcut: "/images/entreno-logo.png?v=trainc8",
    apple: "/images/entreno-logo.png?v=trainc8",
  },
};

export default function EntrenoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}