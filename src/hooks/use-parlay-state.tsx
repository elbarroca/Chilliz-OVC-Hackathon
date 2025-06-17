'use client';

import { useState, useEffect, useCallback } from 'react';
import { type ParlaySelectionDetails } from '@/components/features/StakingInterface';

const PARLAY_STORAGE_KEY = 'alpha_steam_parlay_selections';

export function useParlayState() {
  const [parlaySelections, setParlaySelections] = useState<ParlaySelectionDetails[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
    console.log('Adding to parlay:', selection);
    setParlaySelections(prev => {
      // Check if this match already has a selection in the parlay
      const existingIndex = prev.findIndex(s => s.matchId === selection.matchId);
      if (existingIndex !== -1) {
        // Replace existing selection for this match
        const updated = [...prev];
        updated[existingIndex] = selection;
        return updated;
      } else {
        // Add new selection
        return [...prev, selection];
      }
    });
  }, []);

  const handleRemoveParlayItem = useCallback((matchId: string) => {
    setParlaySelections(prev => prev.filter(s => s.matchId !== matchId));
  }, []);

  const handleClearParlay = useCallback(() => {
    setParlaySelections([]);
  }, []);

  const handlePlaceParlayBet = useCallback((amount: number) => {
    console.log('Placing parlay bet for:', amount, 'CHZ with selections:', parlaySelections);
    alert(`Parlay bet of ${amount} CHZ placed! (See console for details)`);
    handleClearParlay();
  }, [parlaySelections, handleClearParlay]);

  const handlePlaceSingleBet = useCallback((selection: ParlaySelectionDetails, amount: number) => {
    console.log('Placing single bet for:', amount, 'CHZ with selection:', selection);
    alert(`Single bet of ${amount} CHZ placed on ${selection.selectionName}! (See console for details)`);
  }, []);

  return {
    parlaySelections,
    isLoaded,
    handleSelectBet,
    handleRemoveParlayItem,
    handleClearParlay,
    handlePlaceParlayBet,
    handlePlaceSingleBet
  };
} 