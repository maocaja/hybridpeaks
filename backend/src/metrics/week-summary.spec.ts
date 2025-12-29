import { calculateWeekSummary } from './week-summary';
import { SessionStatus, SessionType } from '@prisma/client';

describe('calculateWeekSummary', () => {
  it('calculates counts and adherence rate', () => {
    const summary = calculateWeekSummary([
      { status: SessionStatus.COMPLETED, type: SessionType.STRENGTH },
      { status: SessionStatus.MISSED, type: SessionType.ENDURANCE },
      { status: SessionStatus.MODIFIED, type: SessionType.STRENGTH },
      { status: SessionStatus.PLANNED, type: SessionType.ENDURANCE },
    ]);

    expect(summary).toEqual({
      plannedSessionsCount: 4,
      completedSessionsCount: 1,
      missedSessionsCount: 1,
      adherenceRate: 0.25,
      strengthCount: 2,
      enduranceCount: 2,
    });
  });
});
