// activity-detail.model.ts
import { ActivityLog, osForDevice } from './activity-log.model';

export interface TimelineStep {
  id: string;
  label: string;
  time: string; // ISO
  icon: 'request' | 'auth' | 'database' | 'audit' | 'response' | 'error';
}

export interface ActivityLogDetail extends ActivityLog {
  operatingSystem: string;
  sessionId: string;
  requestId: string;
  timeline: TimelineStep[];
}

function seedFromId(id: string): number {
  const n = parseInt(id.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function hex(n: number, len: number): string {
  return Math.abs(n).toString(16).padStart(len, '0').slice(0, len);
}

function buildTimeline(log: ActivityLog, seed: number): TimelineStep[] {
  const base = new Date(log.createdAt).getTime();

  const steps: { offsetMs: number; label: string; icon: TimelineStep['icon'] }[] = [
    { offsetMs: 0,    label: 'Request received',        icon: 'request' },
    { offsetMs: 400,  label: 'Authorization verified',  icon: 'auth' },
    { offsetMs: 900,  label: log.action === 'VIEW' ? 'Record retrieved' : 'Database updated', icon: 'database' },
    { offsetMs: 1300, label: 'Audit log recorded',       icon: 'audit' },
  ];

  if (log.success) {
    steps.push({ offsetMs: 1700, label: 'Response returned', icon: 'response' });
  } else {
    steps.push({ offsetMs: 1700, label: 'Operation failed — error returned', icon: 'error' });
  }

  return steps.map((s, i) => ({
    id: `${log.id}-step-${i}`,
    label: s.label,
    time: new Date(base + s.offsetMs).toISOString(),
    icon: s.icon,
  }));
}

export function toActivityDetail(log: ActivityLog): ActivityLogDetail {
  const seed = seedFromId(log.id);
  return {
    ...log,
    operatingSystem: osForDevice(log.device, seed),
    sessionId: `sess_${hex(seed * 9973 + 17, 12)}`,
    requestId: `req_${hex(seed * 6151 + 31, 14)}`,
    timeline: buildTimeline(log, seed),
  };
}