import type { Metadata } from "next";
import Link from "next/link";
import { AudioPlayer } from "@/components/player/audio-player";
import { PlayerProvider } from "@/components/player/player-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fireside Chat — Hear them yourself",
    template: "%s | Fireside Chat",
  },
  description:
    "A searchable archive for podcasts, personal chats and livestreams hosted by current and former members of Congress and U.S. presidents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <div className="site-shell">
            <header className="site-header">
              <Link className="brand" href="/">
                <span className="brand-mark" aria-hidden="true">FC</span>
                <span>Fireside Chat</span>
              </Link>

              <nav className="site-nav" aria-label="Primary navigation">
                <Link href="/#shows">Shows</Link>
                <Link href="/episodes">Episodes</Link>
                <Link href="/videos">Videos</Link>
                <Link href="/people">People</Link>
                <Link href="/search">Search</Link>
                <Link href="/podcast-production">Production services</Link>
              </nav>

              <form className="header-search" action="/search">
                <input name="q" aria-label="Search" placeholder="Search archive" />
                <button type="submit" aria-label="Submit search">→</button>
              </form>
            </header>

            <main>{children}</main>

            <footer className="site-footer">
              <div>
                <Link className="footer-brand" href="/">Fireside Chat</Link>
                <span>Hear them yourself.</span>
                <Link className="studio-footer-link" href="/podcast-production">Starting a podcast? Request production help.</Link>
              </div>
              <p>
                Independent, nonpartisan, and not affiliated with or endorsed by
                the public officials whose programs appear here.
              </p>
            </footer>
          </div>

          <AudioPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
