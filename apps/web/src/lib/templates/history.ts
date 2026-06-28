import type { NudgeHistory, TemplateType } from '@harmony/shared';
import { db } from '../db/schema';
import { mirrorNudge } from '../supabase/sync';
import { getTemplate } from './library';

// Reads and records nudge history (the side-effecting half of the engine,
// kept out of the pure composer). The composer uses recentTemplateIds from
// here to vary its wording; the caller records the chosen nudge.

const DAY_MS = 86_400_000;

export async function nudgeHistoryForUser(userId: string, withinDays = 14): Promise<NudgeHistory[]> {
  const since = Date.now() - withinDays * DAY_MS;
  const rows = await db.nudgeHistory.where('userId').equals(userId).toArray();
  return rows.filter((n) => n.sentAt >= since);
}

// Template ids used for one area and template-type within the window, so the
// composer can avoid repeating itself (selection step 2).
export function recentTemplateIdsFor(
  history: NudgeHistory[],
  areaId: string | null,
  type: TemplateType,
): string[] {
  return history
    .filter((n) => n.areaId === areaId && getTemplate(n.templateId)?.type === type)
    .map((n) => n.templateId);
}

export async function recordNudge(entry: {
  userId: string;
  templateId: string;
  areaId: string | null;
  habitId: string | null;
  composedText: string;
  channel: 'push' | 'in-app';
}): Promise<NudgeHistory> {
  const row: NudgeHistory = {
    id: crypto.randomUUID(),
    sentAt: Date.now(),
    ...entry,
  };
  await db.nudgeHistory.put(row);
  void mirrorNudge(row);
  return row;
}
