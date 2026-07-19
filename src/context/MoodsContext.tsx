import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadMoodAssignments,
  saveMoodAssignments,
  toggleMood as toggleMoodAssignment,
  type Mood,
  type MoodAssignments,
} from '../lib/moods'

type MoodsContextValue = {
  assignments: MoodAssignments
  getMoods: (catalogId: string) => Mood[]
  toggleMood: (catalogId: string, mood: Mood) => void
  setMoods: (catalogId: string, moods: Mood[]) => void
}

const MoodsContext = createContext<MoodsContextValue | null>(null)

export function MoodsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<MoodAssignments>(() => loadMoodAssignments())

  useEffect(() => {
    saveMoodAssignments(assignments)
  }, [assignments])

  const getMoods = useCallback(
    (catalogId: string) => assignments[catalogId] ?? [],
    [assignments],
  )

  const toggleMood = useCallback((catalogId: string, mood: Mood) => {
    setAssignments((current) => toggleMoodAssignment(current, catalogId, mood))
  }, [])

  const setMoods = useCallback((catalogId: string, moods: Mood[]) => {
    setAssignments((current) => {
      const next = { ...current }
      if (moods.length === 0) delete next[catalogId]
      else next[catalogId] = moods
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ assignments, getMoods, toggleMood, setMoods }),
    [assignments, getMoods, toggleMood, setMoods],
  )

  return <MoodsContext.Provider value={value}>{children}</MoodsContext.Provider>
}

export function useMoods(): MoodsContextValue {
  const value = useContext(MoodsContext)
  if (!value) throw new Error('useMoods must be used within MoodsProvider')
  return value
}
