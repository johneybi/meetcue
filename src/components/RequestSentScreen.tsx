import { useMediaQuery } from '../hooks/useMediaQuery'
import { toast } from 'sonner'
import { Copy, ArrowUpRight } from 'lucide-react'
import { buildRouteHash } from '../lib/appRoutes'
import { formatDeadline, participantRoleLabels, type Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import { PersonIdentity } from './PersonIdentity'
import { MainCard } from './ui/main-card'
import './RequestSentScreen.css'

export function RequestSentScreen({
  meeting,
  onOpenHost,
}: {
  meeting: Meeting
  onOpenHost: () => void
}) {
  const isMobile = useMediaQuery('(max-width: 760px)')
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length

  return (
    <div className="share-workspace">
      <MainCard material="soft" className="share-card">
        <header className="share-card__header">
          <div>
            <span>회의 초대</span>
            <h1>초대와 응답 현황</h1>
            <p>
              {meeting.title} ·{' '}
              {meeting.status === 'confirmed'
                ? '확정된 회의'
                : `${formatDeadline(meeting.responseDeadline)} 마감`}
            </p>
          </div>
        </header>
        <div className="share-response-summary" role="status">
          <span>
            <strong>{completedCount}</strong> / {responseTargets.length}명 응답 완료
          </span>
          <span>
            {responseTargets.length - completedCount > 0
              ? `${responseTargets.length - completedCount}명 미응답`
              : '모두 응답했어요'}
          </span>
          <progress
            value={completedCount}
            max={Math.max(1, responseTargets.length)}
            aria-label="참석자 응답 진행"
          />
        </div>
        <div className="request-recipient-list" aria-label="응답 요청 대상">
          {responseTargets.map((participant) => (
            <div className="request-recipient-row" key={participant.id}>
              <PersonIdentity
                name={participant.name}
                detail={participantRoleLabels[participant.role]}
              />
              <span
                className={`request-delivery-status${
                  participant.responseStatus === 'submitted' ? ' is-complete' : ''
                }`}
              >
                {participant.responseStatus === 'submitted' ? '응답 완료' : '응답 대기'}
              </span>
              <details className="invite-recipient-actions" open={!isMobile || undefined}>
                <summary aria-label={`${participant.name}님 초대 메뉴`}>초대 메뉴</summary>
                <div className="invite-recipient-actions__links">
                  <button
                    className="invite-link-action"
                    type="button"
                    aria-label={`${participant.name}님 초대 링크 복사`}
                    onClick={async () => {
                      const url = new URL(window.location.href)
                      url.hash = buildRouteHash('invite', participant.responseToken, meeting.id)
                      try {
                        await navigator.clipboard.writeText(url.toString())
                        toast.success(`${participant.name}님 초대 링크를 복사했어요`)
                      } catch {
                        toast.error('복사하지 못했어요. 응답 화면을 열고 주소를 복사해 주세요.')
                      }
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                    링크 복사
                  </button>
                  <a
                    className="invite-link-action"
                    href={buildRouteHash('invite', participant.responseToken, meeting.id)}
                    aria-label={`${participant.name}님 응답 화면 열기`}
                  >
                    <ArrowUpRight size={15} aria-hidden="true" />
                    응답 화면 미리보기
                  </a>
                </div>
              </details>
            </div>
          ))}
        </div>
        <p className="service-demo-note">
          예시 환경에서는 같은 브라우저에서 초대와 응답을 체험할 수 있어요. 외부 메시지는 발송되지
          않아요.
        </p>
        <footer className="share-card__footer">
          <p>
            {completedCount > 0
              ? meeting.status === 'confirmed'
                ? '확정한 일정을 확인할 수 있어요.'
                : `${completedCount}명의 응답으로 후보를 확인해 보세요.`
              : '응답이 오면 후보 시간을 바로 계산해요.'}
          </p>
          <Button size="action" onClick={onOpenHost}>
            회의 결과 보기
          </Button>
        </footer>
      </MainCard>
    </div>
  )
}
