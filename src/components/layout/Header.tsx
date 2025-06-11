// src/components/layout/Header.tsx

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/4066.png" alt="Chiliz Logo" className="h-8 w-8" />
          <span className="text-2xl font-bold text-white tracking-tighter">AlphaStakes</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#matches" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Matches
            </Link>
            <Link href="/stakes" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              My Stakes
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Leaderboard
            </Link>
          </nav>
          <div className="h-10 w-px bg-gray-700 hidden md:block"></div>
          <ConnectButton
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
          />
        </div>
      </div>
    </header>
  );
}