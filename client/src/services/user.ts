import { generateUserId } from '@conclave/shared';
import { settings } from './settings';

export const DEFAULT_EMOJIS = ['🦊', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🦄', '🐝', '🦖', '🐙', '🦋', '🌵', '🍕', '🚀', '🎸', '🕹️', '🧙', '👽'];

export const getUserId = (): string => {
  let userId = settings.getUserId();
  if (!userId) {
    userId = generateUserId();
    settings.setUserId(userId);
  }
  return userId;
};

export const getUserName = (): string => {
  return settings.getUserName() || '';
};

export const setUserName = (name: string) => {
  settings.setUserName(name.trim());
};

export const getUserEmoji = (): string => {
  const emoji = settings.getUserMood();
  if (emoji) return emoji;

  const defaultEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)] || '🦊';
  settings.setUserMood(defaultEmoji);
  return defaultEmoji;
};

export const setUserEmoji = (emoji: string) => settings.setUserMood(emoji);
export const getAvailableEmojis = () => DEFAULT_EMOJIS;
