export interface Participant {
  id: string;
  name: string;
  vote: string | null;
  isAdmin: boolean;
  isSpectator: boolean;
}

export interface RoomState {
  participants: Participant[];
  revealed: boolean;
  currentTask: string;
}

export type SocketMessage = 
  | { type: 'JOIN'; name: string; isSpectator?: boolean }
  | { type: 'VOTE'; vote: string | null }
  | { type: 'REVEAL' }
  | { type: 'RESET' }
  | { type: 'SET_TASK'; task: string };
