/** Pilot metrics: week numbering and retention. */

const DAY = 24 * 3600 * 1000;

/** 1-based pilot week for a date, given the participant's pilot start date. */
export function pilotWeek(startDate: string, at: Date | string = new Date()): number {
  const t = typeof at === "string" ? Date.parse(at) : at.getTime();
  const start = Date.parse(startDate.slice(0, 10) + "T00:00:00Z");
  return Math.floor((t - start) / (7 * DAY)) + 1;
}

export interface RetentionParticipant {
  id: string;
  pilotStart: string | null;
  /** Participants who withdrew stop counting from their withdrawal week onwards. */
  withdrawnAt?: string | null;
}

export interface RetentionCheckin {
  participantId: string;
  week: number;
}

export interface RetentionWeek {
  week: number;
  eligible: number;
  reported: number;
  rate: number | null;
}

/**
 * For each week, the share of participants whose pilot had reached that week
 * who submitted a check-in for it. Week 6 is the pilot's key retention question.
 */
export function retentionByWeek(
  participants: RetentionParticipant[],
  checkins: RetentionCheckin[],
  maxWeek: number,
  asOf: Date = new Date(),
): RetentionWeek[] {
  const reportedBy = new Map<number, Set<string>>();
  for (const c of checkins) {
    if (!reportedBy.has(c.week)) reportedBy.set(c.week, new Set());
    reportedBy.get(c.week)!.add(c.participantId);
  }
  const rows: RetentionWeek[] = [];
  for (let week = 1; week <= maxWeek; week++) {
    const eligibleIds = participants.filter((p) => {
      if (!p.pilotStart) return false;
      // A week is eligible once it has fully elapsed or is the current week.
      if (pilotWeek(p.pilotStart, asOf) < week) return false;
      if (p.withdrawnAt && pilotWeek(p.pilotStart, p.withdrawnAt) <= week) return false;
      return true;
    });
    const reported = eligibleIds.filter((p) => reportedBy.get(week)?.has(p.id)).length;
    rows.push({
      week,
      eligible: eligibleIds.length,
      reported,
      rate: eligibleIds.length ? Math.round((reported / eligibleIds.length) * 100) / 100 : null,
    });
  }
  return rows;
}

/** Participants (active, pilot started) with no check-in for the current week. */
export function missingCheckinThisWeek(
  participants: RetentionParticipant[],
  checkins: RetentionCheckin[],
  asOf: Date = new Date(),
): string[] {
  return participants
    .filter((p) => p.pilotStart && !p.withdrawnAt && pilotWeek(p.pilotStart, asOf) >= 1)
    .filter((p) => !checkins.some((c) => c.participantId === p.id && c.week === pilotWeek(p.pilotStart!, asOf)))
    .map((p) => p.id);
}
