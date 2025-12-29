import { SessionStatus, SessionType } from '@prisma/client';

export interface WeekSummary {
  plannedSessionsCount: number;
  completedSessionsCount: number;
  missedSessionsCount: number;
  adherenceRate: number;
  strengthCount: number;
  enduranceCount: number;
}

interface SummarySession {
  status: SessionStatus;
  type: SessionType;
}

export function calculateWeekSummary(sessions: SummarySession[]): WeekSummary {
  const plannedSessionsCount = sessions.length;
  const completedSessionsCount = sessions.filter(
    (session) => session.status === SessionStatus.COMPLETED,
  ).length;
  const missedSessionsCount = sessions.filter(
    (session) => session.status === SessionStatus.MISSED,
  ).length;
  const strengthCount = sessions.filter(
    (session) => session.type === SessionType.STRENGTH,
  ).length;
  const enduranceCount = sessions.filter(
    (session) => session.type === SessionType.ENDURANCE,
  ).length;

  const adherenceRate =
    plannedSessionsCount === 0
      ? 0
      : completedSessionsCount / plannedSessionsCount;

  return {
    plannedSessionsCount,
    completedSessionsCount,
    missedSessionsCount,
    adherenceRate,
    strengthCount,
    enduranceCount,
  };
}
