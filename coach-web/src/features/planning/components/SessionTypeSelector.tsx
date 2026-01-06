import { Button, Modal } from '../../../shared/components'
import './SessionTypeSelector.css'

export interface SessionTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectType: (type: 'STRENGTH' | 'ENDURANCE') => void
}

export function SessionTypeSelector({
  isOpen,
  onClose,
  onSelectType,
}: SessionTypeSelectorProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Session Type" size="small">
      <div className="session-type-selector">
        <p className="session-type-selector-description">
          Choose the type of training session you want to create:
        </p>
        <div className="session-type-options">
          <button
            type="button"
            className="session-type-option session-type-strength"
            onClick={() => {
              onSelectType('STRENGTH')
              // Don't call onClose here - let handleTypeSelect handle it
            }}
          >
            <div className="session-type-icon">💪</div>
            <div className="session-type-name">Strength</div>
            <div className="session-type-description">Weight training, resistance exercises</div>
          </button>
          <button
            type="button"
            className="session-type-option session-type-endurance"
            onClick={() => {
              onSelectType('ENDURANCE')
              // Don't call onClose here - let handleTypeSelect handle it
            }}
          >
            <div className="session-type-icon">🏃</div>
            <div className="session-type-name">Endurance</div>
            <div className="session-type-description">Cardio, bike, run, swim</div>
          </button>
        </div>
        <div className="session-type-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

