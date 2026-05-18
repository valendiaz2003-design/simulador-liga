import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrainC+",
  icons: {
    icon: "/images/entreno-logo.png?v=trainc6",
    shortcut: "/images/entreno-logo.png?v=trainc6",
    apple: "/images/entreno-logo.png?v=trainc6",
  },
};

export default function EntrenoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}