// Shared types from backend
export interface User {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  position: string;
  hireDate: Date;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut?: Date;
  totalHours?: number;
  date: string;
  breaks?: Break[];
}

export interface Break {
  id: string;
  timeEntryId: string;
  type: 'coffee' | 'lunch' | 'bathroom' | 'other';
  startTime: Date;
  endTime?: Date;
  totalMinutes?: number;
}

export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isActive: boolean;
}

export interface Incident {
  id: string;
  employeeId: string;
  type: 'late' | 'absence' | 'early_departure' | 'forgot_clock_in' | 'forgot_clock_out';
  description: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}