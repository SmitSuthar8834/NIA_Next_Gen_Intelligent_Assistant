import { create } from 'zustand';

interface MeetingState {
  isConnected: boolean;
  isMuted: boolean;
  isInCall: boolean;
  participants: string[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  
  setConnected: (connected: boolean) => void;
  setMuted: (muted: boolean) => void;
  setInCall: (inCall: boolean) => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  addParticipant: (userId: string) => void;
  removeParticipant: (userId: string) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  isConnected: false,
  isMuted: false,
  isInCall: false,
  participants: [],
  connectionStatus: 'disconnected',
  
  setConnected: (connected) => set({ isConnected: connected }),
  setMuted: (muted) => set({ isMuted: muted }),
  setInCall: (inCall) => set({ isInCall: inCall }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addParticipant: (userId) => set((state) => ({ 
    participants: [...state.participants.filter(p => p !== userId), userId] 
  })),
  removeParticipant: (userId) => set((state) => ({ 
    participants: state.participants.filter(p => p !== userId) 
  })),
  reset: () => set({
    isConnected: false,
    isMuted: false,
    isInCall: false,
    participants: [],
    connectionStatus: 'disconnected'
  })
}));