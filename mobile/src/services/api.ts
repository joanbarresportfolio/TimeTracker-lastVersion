import Constants from 'expo-constants';
import { User, LoginResponse, TimeEntry, Schedule, Incident, Break } from '../types';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:5000';

class ApiService {
  private token: string | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  clearAuthToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // Time Entries
  async getMyTimeEntries(): Promise<TimeEntry[]> {
    return this.request<TimeEntry[]>('/api/time-entries/my');
  }

  async clockIn(): Promise<TimeEntry> {
    return this.request<TimeEntry>('/api/time-entries/clock-in', {
      method: 'POST',
    });
  }

  async clockOut(): Promise<TimeEntry> {
    return this.request<TimeEntry>('/api/time-entries/clock-out', {
      method: 'PUT',
    });
  }

  // Breaks
  async startBreak(type: 'coffee' | 'lunch' | 'bathroom' | 'other'): Promise<Break> {
    return this.request<Break>('/api/breaks/start', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async endBreak(breakId: string): Promise<Break> {
    return this.request<Break>(`/api/breaks/${breakId}/end`, {
      method: 'PUT',
    });
  }

  // Schedules
  async getMySchedules(): Promise<Schedule[]> {
    return this.request<Schedule[]>('/api/schedules/my');
  }

  // Incidents
  async getMyIncidents(): Promise<Incident[]> {
    return this.request<Incident[]>('/api/incidents/my');
  }

  async createIncident(data: {
    type: string;
    description: string;
    date: Date;
  }): Promise<Incident> {
    return this.request<Incident>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();