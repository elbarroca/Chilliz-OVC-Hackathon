import Link from 'next/link';
import { GithubIcon } from '../icons/GithubIcon';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black/50">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 py-12 text-sm text-gray-400">
        <div className="flex flex-col gap-4 items-start">
            <Link href="/" className="flex items-center gap-3">
                <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/4066.png" alt="Chiliz Logo" className="h-8 w-8" />
                <span className="text-xl font-bold text-white tracking-tighter">AlphaStakes</span>
            </Link>
            <p className="max-w-xs">The premier prediction market where fan passion meets data-driven strategy.</p>
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} AlphaStakes. All rights reserved.</p>
        </div>
        <div className="grid grid-cols-2 gap-8">
            <div>
                <h3 className="font-bold text-white mb-4">Navigation</h3>
                <ul className="space-y-3">
                    <li><Link href="/#matches" className="hover:text-white transition-colors">Matches</Link></li>
                    <li><Link href="/stakes" className="hover:text-white transition-colors">My Stakes</Link></li>
                    <li><Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
                </ul>
            </div>
            <div>
                <h3 className="font-bold text-white mb-4">Resources</h3>
                <ul className="space-y-3">
                    <li>
                        <Link href="https://github.com/elbarroca/Chilliz-OVC-Hackathon" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                            <GithubIcon className="h-4 w-4" />
                            Source Code
                        </Link>
                    </li>
                    <li>
                        <Link href="https://www.chiliz.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                            <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/4066.png" alt="Chiliz Logo" className="h-4 w-4" />
                            Powered by Chiliz
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
        <div className="md:text-right">
             <h3 className="font-bold text-white mb-4">Disclaimer</h3>
             <p className="text-xs">This is a hackathon project and should not be used for real monetary transactions. All data is for demonstration purposes only.</p>
        </div>
      </div>
    </footer>
  );
}