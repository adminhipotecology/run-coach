import type { Metadata } from "next"
import "@/styles/globals.css"

export const metadata: Metadata = {
  title: "RunCoach — AI Running Training",
  description: "Personalized running training plans powered by AI",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
