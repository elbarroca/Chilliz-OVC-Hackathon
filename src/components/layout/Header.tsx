// src/components/layout/Header.tsx

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/50 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* You can replace this with a logo SVG */}
          <span className="text-xl font-bold text-white">AlphaStakes</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6">
            <Link href="#matches" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Matches
            </Link>
            <Link href="/stakes" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              My Stakes
            </Link>
          </nav>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}