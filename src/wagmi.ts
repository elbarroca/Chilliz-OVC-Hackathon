// Import the necessary configuration tools
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// It's cleaner to define our custom chains first.
// This is the required configuration for the Chiliz networks.

const chilizSpicy = {
  id: 88882,
  name: 'Chiliz Spicy Testnet',
  nativeCurrency: { name: 'Chiliz', symbol: 'CHZ', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://spicy-rpc.chiliz.com'] },
  },
  blockExplorers: {
    default: { name: 'ChilizScan', url: 'https://spicy.chilizscan.com' },
  },
  iconUrl: 'https://www.chiliz.com/wp-content/uploads/2023/04/chiliz-chain-cc2-logo.svg', // Optional: Adds a logo in the wallet UI
};

const chilizMainnet = {
  id: 88888,
  name: 'Chiliz Chain',
  nativeCurrency: { name: 'Chiliz', symbol: 'CHZ', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.chiliz.com'] },
  },
  blockExplorers: {
    default: { name: 'ChilizScan', url: 'https://chilizscan.com' },
  },
  iconUrl: 'https://www.chiliz.com/wp-content/uploads/2023/04/chiliz-chain-cc2-logo.svg', // Optional: Adds a logo
};


// Now, we configure our app with these chains.
export const config = getDefaultConfig({
  appName: 'AlphaStakes', // Changed to your project name
  projectId: 'YOUR_PROJECT_ID', // IMPORTANT: Get this from WalletConnect Cloud

  // The 'chains' array determines which networks your dApp supports.
  chains: [
    // We will always include the Chiliz Mainnet as the primary chain.
    chilizMainnet, 

    // We use the environment variable to conditionally add the testnet.
    // This is a best practice for production builds.
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [chilizSpicy] : []),
  ],
  
  ssr: true, // Enable Server-Side Rendering
});