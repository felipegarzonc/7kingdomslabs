import "server-only";
import { todayInColombia } from "@/domain/habits";
import { le8, type Le8Result } from "@/domain/le8";
import { LifestyleSchema } from "@/domain/lifestyle";
import type { Snapshot } from "@/domain/snapshot";
import { deviceSummary } from "@/domain/wearables";
import type { ParticipantRow } from "@/lib/auth";
import type { loadParticipantData } from "./snapshot-input";

/** Life's Essential 8 from what we already have: snapshot, lifestyle answers and 14 days of device data. */
export function participantLe8(p: ParticipantRow, data: Awaited<ReturnType<typeof loadParticipantData>>, snapshot: Snapshot): Le8Result | null {
  const lifestyle = LifestyleSchema.partial().safeParse(p.lifestyle ?? {});
  const l = lifestyle.success ? lifestyle.data : {};
  const devices = deviceSummary(data.measurements, todayInColombia(), 14);
  const marker = (code: string) => snapshot.markers.find((m) => m.code === code)?.latest.value ?? null;
  return le8({
    vegetables: l.vegetables,
    processed: l.processed,
    lifestyleActivity: l.activity,
    lifestyleSleep: l.sleep,
    activityMinutesPerWeek: devices?.exercise_minutes_per_week ?? null,
    sleepHours: devices?.sleep_hours ?? null,
    smoking: snapshot.profile.smokingStatus,
    bmi: snapshot.derived.bmi?.value ?? null,
    nonHdl: snapshot.derived.nonHdl,
    fastingGlucose: marker("glucose_fasting"),
    hba1c: marker("hba1c"),
    systolic: snapshot.derived.bp?.recentMeanSystolic ?? null,
    diastolic: snapshot.derived.bp?.recentMeanDiastolic ?? null,
  });
}
