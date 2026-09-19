import { Lead, CallLog, HourlyStat } from './types';

export const INITIAL_LEADS: Lead[] = [
  {
    id: 1,
    name: 'Sarah Jenkins',
    company: 'Apex Logistics Corp',
    phone: '+1 (555) 234-8901',
    email: 'sjenkins@apexlogistics.io',
    timezone: 'US/Eastern (EST)',
    status: 'New Lead',
    nextFollowup: 'Today at 2:00 PM',
    notes: 'Interested in automated dispatch optimization. Inbound inquiry.',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    shiftContactOffsetSeconds: null
  },
  {
    id: 2,
    name: 'Marcus Vance',
    company: 'CloudScale Networks',
    phone: '+1 (555) 981-4432',
    email: 'mvance@cloudscale.net',
    timezone: 'US/Central (CST)',
    status: 'Contacted',
    nextFollowup: 'Tomorrow at 10:30 AM',
    notes: 'Reached IT Director directly. Requested enterprise feature comparison.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    shiftContactOffsetSeconds: 1680 // ~28 mins into shift
  },
  {
    id: 3,
    name: 'Elena Rostova',
    company: 'FinPulse Analytics',
    phone: '+1 (555) 672-1190',
    email: 'elena@finpulse.com',
    timezone: 'US/Pacific (PST)',
    status: 'Transferred to AE',
    nextFollowup: 'Completed Transfer',
    notes: 'High intent: 150-seat engineering team looking to replace legacy stack.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    shiftContactOffsetSeconds: 3120 // ~52 mins into shift
  },
  {
    id: 4,
    name: 'David Miller',
    company: 'Nexus Manufacturing',
    phone: '+1 (555) 433-8765',
    email: 'dmiller@nexus-mfg.com',
    timezone: 'US/Mountain (MST)',
    status: 'Meeting Booked',
    nextFollowup: 'Friday at 1:00 PM',
    notes: 'Booked 30-min product tour with Senior AE Taylor. Focus on SOC2 compliance.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    shiftContactOffsetSeconds: 2400 // ~40 mins into shift
  },
  {
    id: 5,
    name: 'Rachel Green',
    company: 'Beacon Health Systems',
    phone: '+1 (555) 321-7654',
    email: 'rgreen@beaconhealth.org',
    timezone: 'US/Eastern (EST)',
    status: 'Follow-Up Required',
    nextFollowup: 'Tomorrow at 3:15 PM',
    notes: 'Gatekeeper requested call back once clinical director returns from rounds.',
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    shiftContactOffsetSeconds: 4320 // ~1h 12m into shift
  }
];

export const INITIAL_CALL_LOGS: CallLog[] = [
  {
    id: 101,
    leadId: 3,
    leadName: 'Elena Rostova',
    timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    shiftOffsetSeconds: 3120,
    disposition: 'Live Transfer Completed',
    isLiveTransfer: true,
    notes: 'Warm transfer accepted by AE Taylor'
  },
  {
    id: 102,
    leadId: 4,
    leadName: 'David Miller',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    shiftOffsetSeconds: 2400,
    disposition: 'Scheduled Demo',
    isLiveTransfer: false,
    notes: 'Calendar invite sent for Friday 1PM EST'
  },
  {
    id: 103,
    leadId: 2,
    leadName: 'Marcus Vance',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    shiftOffsetSeconds: 1680,
    disposition: 'Connected (Pitching)',
    isLiveTransfer: false,
    notes: 'Interested in API integrations'
  },
  {
    id: 104,
    leadId: null,
    leadName: undefined,
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    shiftOffsetSeconds: 1020,
    disposition: 'Left Voicemail',
    isLiveTransfer: false,
    notes: 'Standard 20-second cadence voicemail #1'
  },
  {
    id: 105,
    leadId: null,
    leadName: undefined,
    timestamp: new Date(Date.now() - 3600000 * 2.0).toISOString(),
    shiftOffsetSeconds: 420,
    disposition: 'Gatekeeper Rejection',
    isLiveTransfer: false,
    notes: 'Screened by executive assistant'
  }
];

export const INITIAL_HOURLY_STATS: HourlyStat[] = [
  { hour: 8, label: '08:00 AM', totalCalls: 12, connects: 4, transfers: 1, connectRatePct: 33.3 },
  { hour: 9, label: '09:00 AM', totalCalls: 24, connects: 11, transfers: 2, connectRatePct: 45.8 },
  { hour: 10, label: '10:00 AM', totalCalls: 19, connects: 5, transfers: 0, connectRatePct: 26.3 },
  { hour: 11, label: '11:00 AM', totalCalls: 21, connects: 9, transfers: 1, connectRatePct: 42.9 },
  { hour: 12, label: '12:00 PM', totalCalls: 8, connects: 2, transfers: 0, connectRatePct: 25.0 },
  { hour: 13, label: '01:00 PM', totalCalls: 14, connects: 4, transfers: 0, connectRatePct: 28.6 },
  { hour: 14, label: '02:00 PM', totalCalls: 22, connects: 9, transfers: 1, connectRatePct: 40.9 },
  { hour: 15, label: '03:00 PM', totalCalls: 17, connects: 6, transfers: 0, connectRatePct: 35.3 },
  { hour: 16, label: '04:00 PM', totalCalls: 25, connects: 12, transfers: 3, connectRatePct: 48.0 }
];

export const DEFAULT_TARGETS = {
  dialTarget: 80,
  connectTarget: 25,
  transferTarget: 4
};

export const INITIAL_SEVEN_SHIFTS_HISTORY = [
  { shiftName: 'Shift 1', date: 'Sep 13', dials: 74, connects: 21, transfers: 2, connectRatePct: 28.4, targetRatePct: 30 },
  { shiftName: 'Shift 2', date: 'Sep 14', dials: 82, connects: 28, transfers: 4, connectRatePct: 34.1, targetRatePct: 30 },
  { shiftName: 'Shift 3', date: 'Sep 15', dials: 68, connects: 19, transfers: 2, connectRatePct: 27.9, targetRatePct: 30 },
  { shiftName: 'Shift 4', date: 'Sep 16', dials: 91, connects: 39, transfers: 5, connectRatePct: 42.8, targetRatePct: 30 },
  { shiftName: 'Shift 5', date: 'Sep 17', dials: 85, connects: 31, transfers: 4, connectRatePct: 36.5, targetRatePct: 30 },
  { shiftName: 'Shift 6', date: 'Sep 18', dials: 79, connects: 27, transfers: 3, connectRatePct: 34.2, targetRatePct: 30 },
  { shiftName: 'Shift 7 (Today)', date: 'Sep 19', dials: 38, connects: 14, transfers: 2, connectRatePct: 36.8, targetRatePct: 30 }
];
