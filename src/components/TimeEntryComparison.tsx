import { useRef, useState } from 'react'
import { parseDate, startOfWeek, today } from '@internationalized/date'
import { createDefaultHostAvailabilityWindows } from '../domain/availability'
import { assessTimeEntry, timeEntryScenarios } from '../domain/timeEntryComparison'
import type { AvailabilityWindow, Meeting } from '../domain/meeting'
import { AvailabilityWindowPicker } from './AvailabilityWindowPicker'
import { RangeFirstTimePicker } from './RangeFirstTimePicker'
import { Button } from './ui/button'
import './TimeEntryComparison.css'

type Result = ReturnType<typeof assessTimeEntry> & { seconds: number; rangeUpdates: number }

export function TimeEntryComparison({ example }: { example: Meeting }) {
  const [fixture] = useState(() => {
    const monday = startOfWeek(today('Asia/Seoul'), 'ko-KR', 'mon').add({ weeks: 1 })
    return {
      ...example,
      schedulingWindow: {
        startDate: monday.toString(),
        endDate: monday.add({ days: 4 }).toString(),
      },
    }
  })
  const [variant, setVariant] = useState<'A' | 'B'>('B')
  const [scenario, setScenario] = useState(0)
  const [run, setRun] = useState(0)
  const [compact, setCompact] = useState(false)
  return (
    <main className="time-comparison">
      <details
        className="time-comparison__setup"
        open={!compact}
        onToggle={(e) => setCompact(!e.currentTarget.open)}
      >
        <summary>
          비교 설정 · {variant}안 · {timeEntryScenarios[scenario].title}
        </summary>
        <header className="time-comparison__intro">
          <p>시간 입력 비교 · 예시 전용</p>
          <h1>어떤 방식이 더 쉽게 끝날까요?</h1>
          <p>같은 조건으로 두 안을 살펴보세요. 선택을 바꾸면 진행 중인 입력은 초기화돼요.</p>
        </header>
        <div className="time-comparison__controls">
          <fieldset>
            <legend>입력 방식</legend>
            {(['A', 'B'] as const).map((v) => (
              <label key={v}>
                <input
                  type="radio"
                  name="comparison-variant"
                  value={v}
                  checked={variant === v}
                  onChange={() => {
                    setVariant(v)
                    setRun((n) => n + 1)
                  }}
                />
                <span>{v === 'A' ? 'A · 시간표 중심' : 'B · 범위와 예외'}</span>
              </label>
            ))}
          </fieldset>
          <label className="time-comparison__scenario">
            비교 상황
            <select
              value={scenario}
              onChange={(e) => {
                setScenario(Number(e.target.value))
                setRun((n) => n + 1)
              }}
            >
              {timeEntryScenarios.map((s, i) => (
                <option value={i} key={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <ComparisonRun
        key={`${variant}-${scenario}-${run}`}
        example={fixture}
        variant={variant}
        scenario={scenario}
        onRestart={() => setRun((n) => n + 1)}
        onStart={() => setCompact(true)}
      />
    </main>
  )
}

function ComparisonRun({
  example,
  variant,
  scenario,
  onRestart,
  onStart,
}: {
  example: Meeting
  variant: 'A' | 'B'
  scenario: number
  onRestart: () => void
  onStart: () => void
}) {
  const [meeting, setMeeting] = useState(() => ({
    ...example,
    durationMinutes: 60 as const,
    availabilityWindows: createDefaultHostAvailabilityWindows({
      meetingId: example.id,
      hostId: example.hostId,
      ...example.schedulingWindow,
    }),
  }))
  const [started, setStarted] = useState(false)
  const [canFinish, setCanFinish] = useState(variant === 'A')
  const [result, setResult] = useState<Result | null>(null)
  const [updates, setUpdates] = useState(0)
  const [note, setNote] = useState('')
  const began = useRef(0)
  const startViewport = useRef({ width: 0, height: 0 })
  const [exported, setExported] = useState(false)
  const dates = Array.from({ length: 5 }, (_, i) =>
    parseDate(example.schedulingWindow.startDate).add({ days: i }).toString(),
  )
  function update(windows: AvailabilityWindow[]) {
    setMeeting((m) => ({ ...m, availabilityWindows: windows }))
    setUpdates((n) => n + 1)
  }
  return (
    <>
      <aside className="time-comparison__task" aria-label="수행할 과제">
        <strong>
          팀 회의 · 1시간 · {dates[0]}–{dates[4]}
        </strong>
        <p>{timeEntryScenarios[scenario].task}</p>
      </aside>
      {!started ? (
        <div className="time-comparison__start">
          <p>과제를 읽고 시작하세요. 완료 후 선택한 시간과 조건을 비교해요.</p>
          <Button
            onClick={() => {
              began.current = performance.now()
              startViewport.current = { width: window.innerWidth, height: window.innerHeight }
              setStarted(true)
              onStart()
            }}
          >
            입력 시작
          </Button>
        </div>
      ) : result ? (
        <section className="time-comparison__result" aria-label="입력 결과">
          <h2>{result.exact ? '조건과 정확히 일치해요' : '조건과 다른 시간이 있어요'}</h2>
          <dl>
            <div>
              <dt>잘못 포함한 시간</dt>
              <dd>{result.extraMinutes}분</dd>
            </div>
            <div>
              <dt>빠뜨린 시간</dt>
              <dd>{result.missingMinutes}분</dd>
            </div>
            <div>
              <dt>시작부터 완료까지</dt>
              <dd>{result.seconds}초</dd>
            </div>
            <div>
              <dt>범위 변경 적용</dt>
              <dd>{result.rangeUpdates}회</dd>
            </div>
          </dl>
          <p>
            변경 횟수는 클릭 수나 실수 횟수가 아니에요. 경과 시간에는 멈춰 있던 시간도 포함돼요.
          </p>
          <label>
            막혔던 점·범위를 이해한 방식
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="선택 이유, 도움을 받은 부분, 수정한 이유 등을 남겨주세요."
            />
          </label>
          <div className="time-comparison__result-actions">
            <Button onClick={onRestart}>같은 조건으로 다시 하기</Button>
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        recordType: 'unclassified-review-run',
                        recordedAt: new Date().toISOString(),
                        variant,
                        scenario: timeEntryScenarios[scenario],
                        dates,
                        startViewport: startViewport.current,
                        result,
                        note,
                        windows: meeting.availabilityWindows,
                        caveat:
                          '검토용 실행 기록. 실제 사용자 관찰 여부와 입력 기기는 별도 분류 필요.',
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: 'application/json' },
                )
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `meetcue-time-${variant}-${timeEntryScenarios[scenario].id}.json`
                a.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
                setExported(true)
              }}
            >
              검토 기록 내려받기
            </Button>
          </div>
          <p role="status">
            {exported
              ? '검토 기록 다운로드를 요청했어요.'
              : '기록은 이 화면에만 있어요. 새로고침하거나 다른 안으로 바꾸기 전에 내려받으세요.'}
          </p>
        </section>
      ) : (
        <section className="time-comparison__work" aria-label={`${variant}안 시간 입력`}>
          <header>
            <h2>참석자에게 물어볼 시간</h2>
            <p>참석 가능 여부는 이 범위를 보낸 뒤 참석자가 직접 답해요.</p>
          </header>
          {variant === 'A' ? (
            <AvailabilityWindowPicker meeting={meeting} onAvailabilityWindowsChange={update} />
          ) : (
            <RangeFirstTimePicker
              meeting={meeting}
              onChange={update}
              onReady={() => setCanFinish(true)}
            />
          )}
          <footer>
            <Button
              disabled={!canFinish}
              width="full"
              onClick={() =>
                setResult({
                  ...assessTimeEntry(meeting.availabilityWindows, meeting.hostId, dates, scenario),
                  seconds: Math.round((performance.now() - began.current) / 100) / 10,
                  rangeUpdates: updates,
                })
              }
            >
              입력 완료 · 결과 확인
            </Button>
          </footer>
        </section>
      )}
    </>
  )
}
