/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { generateUserId } from 'conclave-shared';
import { settings } from './settings';
import emojiData from 'emoji-picker-react/dist/data/emojis.json';

/** Convert a unified code (e.g. "1f600" or "1f468-200d-1f469-200d-1f466") to its emoji string */
const unifiedToEmoji = (unified: string): string =>
  String.fromCodePoint(...unified.split('-').map(hex => parseInt(hex, 16)));

/** Categories used for random default emoji selection */
const AVATAR_CATEGORIES: (keyof typeof emojiData.emojis)[] = [
  'animals_nature',
  'food_drink',
  'activities',
];

/** Flat list of emojis from selected categories, used as initial random avatar */
const START_EMOJIS: string[] = AVATAR_CATEGORIES
  .flatMap(cat => emojiData.emojis[cat])
  .map((e: { u: string }) => unifiedToEmoji(e.u));

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

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const defaultEmoji = START_EMOJIS[Math.floor(Math.random() * START_EMOJIS.length)]!;
  settings.setUserMood(defaultEmoji);
  return defaultEmoji;
};

export const setUserEmoji = (emoji: string) => settings.setUserMood(emoji);
