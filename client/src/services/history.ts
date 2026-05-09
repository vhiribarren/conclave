/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 */

export interface HistoryEntry {
  id: string;
  name?: string;
  visitedAt: number;
  isAdmin?: boolean;
}

const HISTORY_KEY = 'conclave.history';
const MAX_ENTRIES = 5;

export const getHistory = (): HistoryEntry[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (id: string, name?: string, isAdmin?: boolean) => {
  let history = getHistory();
  
  // Remove existing entry for the same room
  history = history.filter(entry => entry.id !== id);
  
  // Add new entry at the beginning
  history.unshift({ id, name, visitedAt: Date.now(), isAdmin });
  
  // Limit to MAX_ENTRIES
  history = history.slice(0, MAX_ENTRIES);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};
