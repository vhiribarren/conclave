import { generateUserId } from '@conclave/shared';

const USER_ID_KEY = 'conclave.user_id';
const USER_NAME_KEY = 'conclave.name';
const USER_EMOJI_KEY = 'conclave.mood';

const DEFAULT_EMOJIS = ['🦊', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🦄', '🐝', '🦖', '🐙', '🦋', '🌵', '🍕', '🚀', '🎸', '🕹️', '🧙', '👽'];

export const getUserId = (): string => {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

export const getUserName = (): string => {
  return localStorage.getItem(USER_NAME_KEY) || '';
};

export const setUserName = (name: string) => {
  localStorage.setItem(USER_NAME_KEY, name.trim());
};

export const getUserEmoji = (): string => {
  const emoji = localStorage.getItem(USER_EMOJI_KEY);
  if (emoji) return emoji;
  
  const defaultEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)] || '🦊';
  localStorage.setItem(USER_EMOJI_KEY, defaultEmoji);
  return defaultEmoji;
};

export const setUserEmoji = (emoji: string) => {
  localStorage.setItem(USER_EMOJI_KEY, emoji);
};

export const getAvailableEmojis = () => DEFAULT_EMOJIS;
