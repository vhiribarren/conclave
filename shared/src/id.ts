import { nanoid, customAlphabet } from 'nanoid';

// Alphabet without ambiguous characters (no 0, O, 1, l, I)
const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Room IDs are 10 characters long and easy to copy
export const generateRoomId = customAlphabet(ROOM_ALPHABET, 10);

// User IDs are standard 21 characters NanoIDs
export const generateUserId = () => nanoid();
