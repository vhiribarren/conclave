/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 */

import { settings } from "./settings";

export interface HistoryEntry {
  id: string;
  name?: string;
  visitedAt: number;
  isAdmin?: boolean;
}

const MAX_ENTRIES = 5;

export const getHistory = (): HistoryEntry[] => {
  try {
    const stored = settings.getHistory();
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (id: string, name?: string, isAdmin?: boolean) => {
  let history = getHistory();

  history = history.filter(entry => entry.id !== id);
  history.unshift({ id, name, visitedAt: Date.now(), isAdmin });
  history = history.slice(0, MAX_ENTRIES);

  settings.setHistory(JSON.stringify(history));
};
