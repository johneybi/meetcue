import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Check, ChevronRight, X } from 'lucide-react'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import './OrganizationDirectoryPicker.css'

type OrganizationPerson = {
  name: string
  role: string
}

type OrganizationTeam = {
  id: string
  name: string
  group: string
  people: OrganizationPerson[]
}

type OrganizationSelectionChange = {
  name: string
  selected: boolean
}

const ORGANIZATION_TEAMS: OrganizationTeam[] = [
  {
    id: 'product-design',
    name: '프로덕트 디자인팀',
    group: '프로덕트 조직',
    people: [
      { name: '유진', role: 'Product Designer' },
      { name: '서연', role: 'Product Designer' },
      { name: '수진', role: 'UX Researcher' },
    ],
  },
  {
    id: 'product-engineering',
    name: '프로덕트 개발팀',
    group: '프로덕트 조직',
    people: [
      { name: '현우', role: 'Frontend Developer' },
      { name: '도윤', role: 'Backend Developer' },
      { name: '민수', role: 'Engineering Manager' },
    ],
  },
  {
    id: 'business-strategy',
    name: '사업 전략팀',
    group: '비즈니스 조직',
    people: [
      { name: '다은', role: 'Business Manager' },
      { name: '준호', role: 'Business Analyst' },
      { name: '하나', role: 'Operations Manager' },
    ],
  },
]

const ORGANIZATION_NAMES = ORGANIZATION_TEAMS.flatMap((team) =>
  team.people.map((person) => person.name),
)

export function OrganizationDirectoryPicker({
  selectedNames,
  onClose,
  onApply,
}: {
  selectedNames: string[]
  onClose: () => void
  onApply: (changes: OrganizationSelectionChange[]) => void
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(ORGANIZATION_TEAMS[0].id)
  const selectedNameSet = useMemo(
    () => new Set(selectedNames.map((name) => name.toLocaleLowerCase())),
    [selectedNames],
  )
  const [draftNames, setDraftNames] = useState<Set<string>>(
    () =>
      new Set(
        ORGANIZATION_NAMES.filter((name) => selectedNameSet.has(name.toLocaleLowerCase())),
      ),
  )
  const selectedTeam =
    ORGANIZATION_TEAMS.find((team) => team.id === selectedTeamId) ?? ORGANIZATION_TEAMS[0]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function togglePerson(name: string) {
    setDraftNames((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function applySelection() {
    const changes = ORGANIZATION_NAMES.flatMap((name) => {
      const wasSelected = selectedNameSet.has(name.toLocaleLowerCase())
      const isSelected = draftNames.has(name)
      return wasSelected === isSelected ? [] : [{ name, selected: isSelected }]
    })
    onApply(changes)
    onClose()
  }

  return createPortal(
    <div className="organization-picker-overlay" role="presentation" onClick={onClose}>
      <section
        className="organization-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="organization-picker__header">
          <div>
            <span>사내 구성원</span>
            <h3 id="organization-picker-title">팀에서 참석자를 찾아보세요</h3>
          </div>
          <Button variant="quiet" size="iconSmall" aria-label="조직도 닫기" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </Button>
        </header>

        <div className="organization-picker__body">
          <nav className="organization-team-list" aria-label="조직 팀">
            {ORGANIZATION_TEAMS.map((team) => (
              <button
                type="button"
                aria-pressed={team.id === selectedTeam.id}
                className={team.id === selectedTeam.id ? 'is-selected' : ''}
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
              >
                <span>
                  <small>{team.group}</small>
                  <strong>{team.name}</strong>
                </span>
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            ))}
          </nav>

          <section className="organization-member-panel" aria-labelledby="organization-team-title">
            <header>
              <span>{selectedTeam.group}</span>
              <h4 id="organization-team-title">{selectedTeam.name}</h4>
              <small>{selectedTeam.people.length}명</small>
            </header>
            <div className="organization-member-list">
              {selectedTeam.people.map((person) => {
                const isSelected = draftNames.has(person.name)
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    className={isSelected ? 'is-selected' : ''}
                    key={person.name}
                    onClick={() => togglePerson(person.name)}
                  >
                    <Avatar name={person.name} size="small" />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.role}</small>
                    </span>
                    <span className="organization-member-check" aria-hidden="true">
                      {isSelected ? <Check size={15} strokeWidth={2.5} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <footer className="organization-picker__footer">
          <span>{draftNames.size}명 선택</span>
          <Button onClick={applySelection}>선택 완료</Button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

export function OrganizationDirectoryIcon() {
  return <Building2 aria-hidden="true" size={17} />
}
