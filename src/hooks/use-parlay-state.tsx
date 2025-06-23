'use client';

import { useState, useEffect, useCallback } from 'react';
import { type ParlaySelectionDetails } from '@/components/features/StakingInterface';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from "sonner";

// Minimal ABI for the AlphaStakes contract based on IAlphaStakes.sol
const alphaStakesAbi = [
  {
    "inputs": [],
    "name": "depositChzForCredit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "matchId", "type": "uint256" },
      { "internalType": "enum IAlphaStakes.Outcome", "name": "prediction", "type": "uint8" },
      { "internalType": "uint256", "name": "creditAmount", "type": "uint256" },
      { "internalType": "bool", "name": "isAlphaPool", "type": "bool" }
    ],
    "name": "placeStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// IMPORTANT: Replace with your deployed AlphaStakes contract address
const ALPHA_STAKES_CONTRACT_ADDRESS = '0xYourContractAddressHere';

const PARLAY_STORAGE_KEY = 'alpha_steam_parlay_selections';

export function useParlayState() {
  const [parlaySelections, setParlaySelections] = useState<ParlaySelectionDetails[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Load parlay selections from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PARLAY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setParlaySelections(parsed);
        }
      } catch (error) {
        console.error('Failed to load parlay state from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save to localStorage whenever parlay selections change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(PARLAY_STORAGE_KEY, JSON.stringify(parlaySelections));
      } catch (error) {
        console.error('Failed to save parlay state to localStorage:', error);
      }
    }
  }, [parlaySelections, isLoaded]);

  const handleSelectBet = useCallback((selection: ParlaySelectionDetails) => {
    setParlaySelections(prev => {
      const existingIndex = prev.findIndex(s => s.selectionId === selection.selectionId);
      if (existingIndex !== -1) {
        // If the same bet is selected again, remove it (toggle off)
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return updated;
      } else {
         // If a different bet for the same match is selected, replace it
        const sameMatchIndex = prev.findIndex(s => s.matchId === selection.matchId);
        if (sameMatchIndex !== -1) {
            const updated = [...prev];
            updated[sameMatchIndex] = selection;
            return updated;
        }
        // Otherwise, add the new selection
        return [...prev, selection];
      }
    });
  }, []);

  const handleRemoveParlayItem = useCallback((selectionId: string) => {
    setParlaySelections(prev => prev.filter(s => s.selectionId !== selectionId));
  }, []);

  const handleClearParlay = useCallback(() => {
    setParlaySelections([]);
  }, []);

  const handlePlaceParlayBet = useCallback(async (amount: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet to place a bet.");
      return;
    }
    if (parlaySelections.length === 0) {
      toast.error("Your parlay slip is empty.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid stake amount.");
      return;
    }
    if (ALPHA_STAKES_CONTRACT_ADDRESS === '0xYourContractAddressHere') {
      toast.error("Contract address not configured. Please contact support.");
      console.error("ALPHA_STAKES_CONTRACT_ADDRESS is not set in use-parlay-state.tsx");
      return;
    }

    const toastId = toast.loading("Preparing your bet...");

    try {
      // --- SMART CONTRACT INTERACTION ---
      // NOTE: The current contract supports single bets. For this demonstration,
      // we are placing a bet on the *first* selection of the parlay slip.
      // A true parlay would require a separate smart contract function.
      const selection = parlaySelections[0];
      if (parlaySelections.length > 1) {
          toast.info("Parlay functionality is currently in beta. Placing a single bet on your first selection.", { id: toastId });
      }

      // 1. Determine Outcome enum (0: TeamA, 1: Draw, 2: TeamB)
      let outcomeEnum;
      if (selection.selectionName === selection.teamAName) {
        outcomeEnum = 0;
      } else if (selection.selectionName === 'Draw') {
        outcomeEnum = 1;
      } else if (selection.selectionName === selection.teamBName) {
        outcomeEnum = 2;
      } else {
        // For market types like BTTS or Goals, we can't map to a simple win/loss/draw outcome.
        // This highlights a limitation of the current contract design for complex bets.
        // For now, we will throw an error.
        throw new Error(`Cannot determine win/loss/draw outcome for bet type: "${selection.selectionName}"`);
      }

      // 2. Determine if the pool is the Alpha Pool
      const isAlphaPool = selection.poolType === 'alpha';

      // 3. Convert stake amount to the appropriate format (Wei)
      const creditAmount = parseEther(amount.toString());

      // --- Transaction Step 1: Deposit CHZ for AlphaCredit ---
      toast.loading("Depositing CHZ for betting credit...", { id: toastId });
      const depositHash = await writeContractAsync({
        address: ALPHA_STAKES_CONTRACT_ADDRESS,
        abi: alphaStakesAbi,
        functionName: 'depositChzForCredit',
        value: creditAmount,
      });

      // --- Transaction Step 2: Place Stake using AlphaCredit ---
      toast.loading("Placing your stake on-chain...", { id: toastId });
      await writeContractAsync({
        address: ALPHA_STAKES_CONTRACT_ADDRESS,
        abi: alphaStakesAbi,
        functionName: 'placeStake',
        args: [
          BigInt(selection.matchId),
          outcomeEnum,
          creditAmount,
          isAlphaPool
        ]
      });

      toast.success("Bet placed successfully! Good luck!", { id: toastId });
      handleClearParlay();

    } catch (error: any) {
      console.error("Bet placement failed:", error);
      const errorMessage = error.shortMessage || error.message || "An unknown error occurred.";
      toast.error(`Bet placement failed: ${errorMessage}`, { id: toastId });
    }
  }, [isConnected, parlaySelections, writeContractAsync, handleClearParlay]);

  const handlePlaceSingleBet = useCallback(async (selection: ParlaySelectionDetails, amount: number) => {
    // This function can be built out similarly to handlePlaceParlayBet for single wagers.
    console.log('Placing single bet for:', amount, 'CHZ with selection:', selection);
    toast.info(`Single bet of ${amount} CHZ placed on ${selection.selectionName}! (See console for details)`);
  }, []);

  return {
    parlaySelections,
    isLoaded,
    isPending,
    isConfirming,
    isConfirmed,
    handleSelectBet,
    handleRemoveParlayItem,
    handleClearParlay,
    handlePlaceParlayBet,
    handlePlaceSingleBet
  };
} 