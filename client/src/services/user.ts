import { generateUserId } from '@conclave/shared';

const USER_ID_KEY = 'conclave_user_id';
const USER_NAME_KEY = 'conclave_name';

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
