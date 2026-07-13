import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import type { Participant } from '../domain/meeting'
import './HostResponseRequestDialog.css'

type HostResponseRequestDialogProps = {
  evaluation: CandidateEvaluation
  onCancel: () => void
  onSend: (recipientIds: string[]) => void
}

export function HostResponseRequestDialog({
  evaluation,
  onCancel,
  onSend,
}: HostResponseRequestDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdSet = new Set(selectedIds)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLButtonElement>('.icon-button')?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement?.focus()
    }
  }, [onCancel])

  function toggleParticipant(participantId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(participantId)
        ? currentIds.filter((id) => id !== participantId)
        : [...currentIds, participantId],
    )
  }

  function renderParticipantOption(participant: Participant, context: string) {
    return (
      <label className="request-recipient-option" key={participant.id}>
        <input
          type="checkbox"
          checked={selectedIdSet.has(participant.id)}
          onChange={() => toggleParticipant(participant.id)}
        />
        <span className="request-recipient-check" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
        <span>
          <strong>{participant.name}</strong>
          <small>{context}</small>
        </span>
      </label>
    )
  }

  return createPortal(
    <div
      className="request-recipient-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        className="request-recipient-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-recipient-title"
      >
        <header>
          <div>
            <span>응답 요청</span>
            <h2 id="request-recipient-title">누구에게 응답을 요청할까요?</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="응답 요청 창 닫기"
            onClick={onCancel}
          >
            <X size={20} />
          </button>
        </header>

        {evaluation.requiredPending.length > 0 ? (
          <fieldset className="request-recipient-group">
            <legend>이 사람의 ‘가능해요’ 응답이 꼭 필요해요</legend>
            {evaluation.requiredPending.map((participant) =>
              renderParticipantOption(participant, '꼭 참석해야 하는 사람'),
            )}
          </fieldset>
        ) : null}

        {evaluation.positiveResponsesNeededAfterRequiredYes > 0 ? (
          <fieldset className="request-recipient-group">
            <legend>
              이 중 {evaluation.positiveResponsesNeededAfterRequiredYes}명에게 ‘가능해요’ 응답을
              받아야 해요
            </legend>
            {evaluation.optionalPendingPool.map((participant) =>
              renderParticipantOption(participant, '아직 응답하지 않은 사람'),
            )}
          </fieldset>
        ) : null}

        <footer>
          <p>응답이 필요한 사람 중에서 이번에 요청할 사람을 골라주세요.</p>
          <button
            className="primary-button"
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onSend(selectedIds)}
          >
            {selectedIds.length > 0
              ? `${selectedIds.length}명에게 응답 요청하기`
              : '요청할 사람을 선택해 주세요'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
