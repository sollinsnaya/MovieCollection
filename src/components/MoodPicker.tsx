import { useMoods } from '../context/MoodsContext'
import { MOOD_OPTIONS } from '../lib/moods'
import './MoodPicker.css'

type MoodPickerProps = {
  catalogId: string
}

export function MoodPicker({ catalogId }: MoodPickerProps) {
  const { getMoods, toggleMood } = useMoods()
  const selected = new Set(getMoods(catalogId))

  return (
    <section className="mood-picker" aria-labelledby="mood-picker-heading">
      <h2 id="mood-picker-heading">Moods</h2>
      <p className="mood-picker__hint">Saved in this browser — survives closing the app.</p>
      <div className="mood-picker__options">
        {MOOD_OPTIONS.map((mood) => {
          const active = selected.has(mood)
          return (
            <button
              key={mood}
              type="button"
              className={`mood-picker__chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleMood(catalogId, mood)}
            >
              {mood}
            </button>
          )
        })}
      </div>
    </section>
  )
}
