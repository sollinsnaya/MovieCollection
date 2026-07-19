export const MOOD_OPTIONS = [
  'Comfort movie',
  'Funny',
  'Scary',
  'Action-packed',
  'Emotional',
  'Family movie',
  'Date-night movie',
  'Background viewing',
  'Thought-provoking',
] as const

export type Mood = (typeof MOOD_OPTIONS)[number]

/** catalogId → assigned moods */
export type MoodAssignments = Record<string, Mood[]>

export const MOODS_STORAGE_KEY = 'shelf-moods-v1'

export function isMood(value: string): value is Mood {
  return (MOOD_OPTIONS as readonly string[]).includes(value)
}

export function loadMoodAssignments(): MoodAssignments {
  try {
    const raw = localStorage.getItem(MOODS_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    const result: MoodAssignments = {}
    for (const [catalogId, moods] of Object.entries(parsed)) {
      if (!Array.isArray(moods)) continue
      const cleaned = moods.filter((mood): mood is Mood => typeof mood === 'string' && isMood(mood))
      if (cleaned.length > 0) {
        result[catalogId] = Array.from(new Set(cleaned))
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveMoodAssignments(assignments: MoodAssignments): void {
  localStorage.setItem(MOODS_STORAGE_KEY, JSON.stringify(assignments))
}

export function toggleMood(
  assignments: MoodAssignments,
  catalogId: string,
  mood: Mood,
): MoodAssignments {
  const current = new Set(assignments[catalogId] ?? [])
  if (current.has(mood)) current.delete(mood)
  else current.add(mood)

  const next = { ...assignments }
  if (current.size === 0) {
    delete next[catalogId]
  } else {
    next[catalogId] = MOOD_OPTIONS.filter((option) => current.has(option))
  }
  return next
}
