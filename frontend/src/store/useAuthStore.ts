import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'PARENT';

export interface PortalData {
  profile: {
    registrationNumber?: string;
    name?: string;
    batch?: string;
    mobile?: string;
    program?: string;
    department?: string;
    semester?: string;
    specialization?: string;
  };
  timetable: Array<{
    sno: string;
    courseCode: string;
    courseTitle: string;
    credit: string;
    category: string;
    courseType: string;
    faculty: string;
    slot: string;
    room: string;
    academicYear: string;
  }>;
  attendance: Array<{
    courseCode: string;
    courseTitle: string;
    faculty: string;
    slot: string;
    room: string;
    hoursConducted: string;
    hoursAbsent: string;
    attendancePercent: string;
  }>;
  marks: Array<{
    courseCode: string;
    courseType: string;
    rawPerformance: string;
    tests: Array<{ name: string; maxMarks: number; scored: number }>;
  }>;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  registrationNumber?: string;
  student?: {
     id: string;
     year: number;
     section: string;
     batch: string;
     department: string;
  };
  teacher?: {
     id: string;
     name: string;
     department: string;
     subjects: string[];
  };
  parent?: {
     id: string;
     name: string;
     phone?: string;
     childSrmEmail: string;
  };
  admin?: {
     id: string;
     name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  portalData: PortalData | null;
  login: (user: User, token: string, portalData?: PortalData) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setPortalData: (data: PortalData) => void;
}

/** Decode JWT payload and check if it's expired */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      portalData: null,
      login: (user, token, portalData) => set({ user, token, isAuthenticated: true, portalData: portalData || null }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, portalData: null }),
      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),
      setPortalData: (data) => set({ portalData: data }),
    }),
    {
      name: 'auth-storage',
      // On rehydration, clear state if token is expired
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      },
    }
  )
);
