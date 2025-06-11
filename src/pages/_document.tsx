import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="AlphaStakes - AI-Powered Sports Betting Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-black text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 