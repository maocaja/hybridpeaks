import { useState, useMemo } from 'react'
import { useGetAthletes } from '../hooks/useAthletes'
import { LoadingSpinner } from '../../../shared/components'
import './AthleteSelector.css'

export interface AthleteSelectorProps {
  value: string | null
  onChange: (athleteId: string) => void
}

export function AthleteSelector({ value, onChange }: AthleteSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { data: athletes = [], isLoading, error } = useGetAthletes()
  
  // Fix: LoadingSpinner doesn't have a size prop, remove it

  const filteredAthletes = useMemo(() => {
    if (!searchTerm) return athletes
    const term = searchTerm.toLowerCase()
    return athletes.filter(
      (athlete) =>
        athlete.email.toLowerCase().includes(term) ||
        athlete.id.toLowerCase().includes(term),
    )
  }, [athletes, searchTerm])

  const selectedAthlete = useMemo(() => {
    return athletes.find((a) => a.id === value) || null
  }, [athletes, value])

  const handleSelect = (athleteId: string) => {
    onChange(athleteId)
    setIsOpen(false)
    setSearchTerm('')
  }

  if (error) {
    return (
      <div className="athlete-selector-error">
        Failed to load athletes: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="athlete-selector">
      <button
        type="button"
        className="athlete-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            <span>Loading athletes...</span>
          </>
        ) : selectedAthlete ? (
          <>
            <span className="athlete-selector-selected">
              {selectedAthlete.email}
            </span>
            <span className="athlete-selector-arrow">{isOpen ? '▲' : '▼'}</span>
          </>
        ) : (
          <>
            <span className="athlete-selector-placeholder">Select athlete...</span>
            <span className="athlete-selector-arrow">▼</span>
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="athlete-selector-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="athlete-selector-dropdown">
            {athletes.length === 0 ? (
              <div className="athlete-selector-empty">
                No athletes found. Invite an athlete first.
              </div>
            ) : (
              <>
                <div className="athlete-selector-search">
                  <input
                    type="text"
                    placeholder="Search athletes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="athlete-selector-search-input"
                    autoFocus
                  />
                </div>
                <div className="athlete-selector-list">
                  {filteredAthletes.length === 0 ? (
                    <div className="athlete-selector-empty">
                      No athletes match "{searchTerm}"
                    </div>
                  ) : (
                    filteredAthletes.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        className={`athlete-selector-item ${
                          athlete.id === value ? 'athlete-selector-item-selected' : ''
                        }`}
                        onClick={() => handleSelect(athlete.id)}
                      >
                        <div className="athlete-selector-item-email">{athlete.email}</div>
                        {athlete.id === value && (
                          <span className="athlete-selector-item-check">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

