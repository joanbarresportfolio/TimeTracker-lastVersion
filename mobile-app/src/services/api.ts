import Constants from 'expo-constants';
import { LoginRequest, LoginResponse, User } from '../types/auth';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = API_URL;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getMyProfile(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  // Time entries
  async getMyTimeEntries() {
    return this.request('/api/time-entries/my');
  }

  async clockIn() {
    return this.request('/api/time-entries/clock-in', {
      method: 'POST',
      body: JSON.stringify({
        // No need to send employeeId - backend derives it from JWT
      }),
    });
  }

  async clockOut() {
    return this.request('/api/time-entries/clock-out', {
      method: 'POST',
      body: JSON.stringify({
        // No need to send timeEntryId - backend finds today's entry automatically
      }),
    });
  }

  // Schedules
  async getMySchedules() {
    return this.request('/api/schedules/my');
  }

  // Incidents
  async getMyIncidents() {
    return this.request('/api/incidents/my');
  }

  async createIncident(description: string, type: string = 'other') {
    return this.request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        description,
        type,
        date: new Date().toISOString().split('T')[0],
      }),
    });
  }

  // Breaks
  async startBreak(timeEntryId: string, type: 'coffee' | 'lunch' = 'coffee') {
    return this.request('/api/breaks/start', {
      method: 'POST',
      body: JSON.stringify({
        timeEntryId,
        type,
      }),
    });
  }

  async endBreak(breakId: string) {
    return this.request(`/api/breaks/${breakId}/end`, {
      method: 'PUT',
    });
  }
}

export const apiService = new ApiService();