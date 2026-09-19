export type ShiftStatus = 'inactive' | 'active' | 'paused' | 'completed';

export interface Shift {
  id: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalSeconds: number;
  pausedSeconds: number;
  status: ShiftStatus;
}

export type LeadStatus = 
  | 'New Lead'
  | 'Contacted'
  | 'Follow-Up Required'
  | 'Meeting Booked'
  | 'Transferred to AE'
  | 'Unqualified';

export interface Lead {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  timezone: string;
  status: LeadStatus;
  nextFollowup: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  shiftContactOffsetSeconds: number | null; // Seconds elapsed into shift when contacted
}

export interface CallLog {
  id: number;
  leadId: number | null;
  leadName?: string;
  timestamp: string;
  shiftOffsetSeconds: number;
  disposition: string;
  isLiveTransfer: boolean;
  notes: string;
}

export interface DashboardMetrics {
  totalDials: number;
  liveTransfers: number;
  scheduledDemos: number;
  connects: number;
  connectRatePct: number;
  conversionRatePct: number;
}

export interface HourlyStat {
  hour: number;
  label: string;
  totalCalls: number;
  connects: number;
  transfers: number;
  connectRatePct: number;
}

export interface DailyTargets {
  dialTarget: number;
  connectTarget: number;
  transferTarget: number;
}

export interface ShiftHistoryPoint {
  shiftName: string;
  date: string;
  dials: number;
  connects: number;
  transfers: number;
  connectRatePct: number;
  targetRatePct: number;
}

export type ActiveTab = 'hud' | 'dashboard' | 'leads' | 'analytics' | 'bridge' | 'chrome' | 'python' | 'code';
