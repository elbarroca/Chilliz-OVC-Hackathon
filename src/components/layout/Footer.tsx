import Link from 'next/link';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="currentColor" height="1em" width="1em" {...props}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const ChilizIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" {...props}>
        <path d="M16.14 3.21L12.42 6.93 15.15 9.66 18.87 5.94 16.14 3.21M11.31 8.04L7.59 11.76 10.32 14.49 14.04 10.77 11.31 8.04M6.48 12.87L2.76 16.59 5.49 19.32 9.21 15.6 6.48 12.87M15.06 13.71L12.33 16.44 14.19 18.3 15.6 19.71 18.33 17.01 15.06 13.71z" />
    </svg>
);


export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4 py-6 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} AlphaStakes. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <Link href="https://github.com/elbarroca/Chilliz-OVC-Hackathon" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
            <GithubIcon />
            Source Code
          </Link>
          <Link href="https://www.chiliz.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
            <ChilizIcon />
            Powered by Chiliz
          </Link>
        </div>
      </div>
    </footer>
  );
}