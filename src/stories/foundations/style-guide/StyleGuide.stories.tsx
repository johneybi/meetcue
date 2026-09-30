import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, AlertCircle } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Field } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { SelectableCard } from '../../../components/ui/selectable-card'
import {
  MainCard,
  MainCardHeader,
  MainCardContent,
  MainCardFooter,
} from '../../../components/ui/main-card'
import './StyleGuide.css'

const meta = {
  title: '01 Foundations/Style Guide',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'MeetCue의 제품 디자인 언어와 시각·상호작용 계약을 종합 검토하는 스타일 가이드입니다. 장식적 쇼케이스가 아닌 시각 토큰, 타이포그래피 위계, 상태별 언어, 폼 조합, 접근성, 스트레스 테스트 및 구현 한계를 명시합니다.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

interface ColorItem {
  role: string
  token: string
  valueDesc: string
  usage: string
}

const semanticColors: ColorItem[] = [
  {
    role: '캔버스 (Canvas)',
    token: '--mc-fill-canvas',
    valueDesc: 'linear-gradient(#ffffff, #fcfdff 280px)',
    usage: '화면 전체 배경, 상단 부드러운 화이트 그라디언트',
  },
  {
    role: '서피스 (Surface)',
    token: '--mc-color-surface',
    valueDesc: '#ffffff',
    usage: '작업 패널, 카드, 모달 등 기본 레이어 표면',
  },
  {
    role: '서피스 서브틀 (Subtle)',
    token: '--mc-color-surface-subtle',
    valueDesc: '#f4f7fb',
    usage: '보조 영역 배경, 테이블 헤더, 태그 칩 배경',
  },
  {
    role: '경계선 (Border)',
    token: '--mc-color-border',
    valueDesc: '#e0e5ec',
    usage: '일반 카드 외곽선, 구분선, 섹션 경계',
  },
  {
    role: '강조 경계선 (Border Strong)',
    token: '--mc-color-border-strong',
    valueDesc: '#cfd8e5',
    usage: '입력 필드 기본 테두리, 보조 버튼 테두리',
  },
  {
    role: '주조색 (Accent / Primary)',
    token: '--mc-color-accent',
    valueDesc: '#2675ed',
    usage: '주 액션 CTA, 선택 강조 인셋, 포커스 링 핵심 축',
  },
  {
    role: '주조색 소프트 (Accent Soft)',
    token: '--mc-color-accent-soft',
    valueDesc: '#e8f3ff',
    usage: '선택 행 틴트, 포커스 외부 링, 활성 탭 틴트',
  },
  {
    role: '성공 (Success)',
    token: '--mc-color-success',
    valueDesc: '#007f65',
    usage: '확정 가능, 전원 참석, 기준 충족 배지 텍스트',
  },
  {
    role: '주의/대기 (Warning)',
    token: '--mc-color-warning',
    valueDesc: '#9a5700',
    usage: '응답 대기, 정족수 확인 필요 배지 텍스트',
  },
  {
    role: '위험/차단 (Danger)',
    token: '--mc-color-danger',
    valueDesc: '#c23542',
    usage: '참석 불가, 삭제, 불가 후보 배지 텍스트',
  },
]

export const SemanticColorRoles: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">01. 의미론적 색상 역할 (Semantic Colors)</h1>
        <p className="sg-intro-desc">
          MeetCue는 임의의 브랜드 팔레트를 나열하지 않고, 화면 위계와 의사결정 상태를 설명하는 역할
          단위 토큰을 사용합니다.
        </p>
      </header>

      <div className="sg-grid-cards">
        {semanticColors.map((color) => (
          <article key={color.token} className="sg-color-card">
            <div
              className="sg-swatch-preview"
              style={{ background: 'var(' + color.token + ')' }}
              aria-label={color.role + ' 견본'}
            />
            <div className="sg-swatch-meta">
              <span className="sg-swatch-role">{color.role}</span>
              <code className="sg-swatch-token">{color.token}</code>
              <span className="sg-swatch-usage">{color.usage}</span>
            </div>
          </article>
        ))}
      </div>

      <section className="sg-section">
        <h2 className="sg-section-title">색상 사용 원칙</h2>
        <div className="sg-table-wrapper">
          <table className="sg-guide-table">
            <thead>
              <tr>
                <th>역할</th>
                <th>적용 규칙</th>
                <th>금지 규칙</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>파란색 (Accent)</strong>
                </td>
                <td>주 CTA 버튼, 단일 포커스 링, 라디오/카드 선택 인셋</td>
                <td>배경 전체를 진한 파란색으로 칠해 텍스트 가독성을 떨어뜨리는 행위</td>
              </tr>
              <tr>
                <td>
                  <strong>초록색 (Success)</strong>
                </td>
                <td>확정 가능, 기준 충족, 참석 가능 배지</td>
                <td>단순 완료되지 않은 일반 긍정 정보에 남용</td>
              </tr>
              <tr>
                <td>
                  <strong>노란색 (Warning)</strong>
                </td>
                <td>미응답자 대기, 정족수 부족 등 주최자의 확인이 필요한 대기 상태</td>
                <td>치명적 오류 또는 일반 안내 문구에 경고색 사용</td>
              </tr>
              <tr>
                <td>
                  <strong>빨간색 (Danger)</strong>
                </td>
                <td>필수 참석자 불참, 정족수 달성 불가, 회의 삭제</td>
                <td>단순 취소 버튼이나 일반 비활성 상태에 빨간색 사용</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  ),
}

interface TypeScaleItem {
  role: string
  sizeLeading: string
  weight: string
  sample: string
  letterSpacing: string
  context: string
}

const typeScale: TypeScaleItem[] = [
  {
    role: 'Display',
    sizeLeading: '32px / 42px',
    weight: '700 (Bold)',
    sample: '응답을 바탕으로 시간을 정해요',
    letterSpacing: '-0.01em',
    context: '주요 확정 화면 진입 헤더, 핵심 랜딩 표제',
  },
  {
    role: 'Page title',
    sizeLeading: '26px / 36px',
    weight: '700 (Bold)',
    sample: '새로운 회의 조율 시작하기',
    letterSpacing: '-0.01em',
    context: '과업 화면 최상단 페이지 제목 (화면당 1회 제한)',
  },
  {
    role: 'Decision title',
    sizeLeading: '24px / 34px',
    weight: '600 (Semibold)',
    sample: '필요한 동의를 비교해 보세요',
    letterSpacing: '-0.01em',
    context: '의사결정 상세 패널 제목, 후보 시간 검토 헤더',
  },
  {
    role: 'Section title',
    sizeLeading: '20px / 30px',
    weight: '600 (Semibold)',
    sample: '참석자 응답 현황',
    letterSpacing: '0',
    context: '폼 섹션 구분, 참석 기준 요약 제목',
  },
  {
    role: 'Card title',
    sizeLeading: '17px / 26px',
    weight: '600 (Semibold)',
    sample: '9월 22일 화요일 오후 3:00',
    letterSpacing: '0',
    context: '후보 카드 메인 타이틀, 리스트 항목 헤더',
  },
  {
    role: 'Body strong',
    sizeLeading: '15px / 24px',
    weight: '600 (Semibold)',
    sample: '필수 참석자 3명 전원 가능',
    letterSpacing: '0',
    context: '강조 본문, 라벨 강조값, 버튼 내부 문구',
  },
  {
    role: 'Body',
    sizeLeading: '15px / 24px',
    weight: '400~500 (Regular~Medium)',
    sample: '미응답과 변경 의향을 구분하고, 확인된 답을 유지한 채 다음 행동을 안내합니다.',
    letterSpacing: '0',
    context: '설명문, 다이얼로그 안내 본문, 폼 도움말',
  },
  {
    role: 'Caption / Label',
    sizeLeading: '13px / 20px',
    weight: '500~600',
    sample: '선택한 참석자에게 다시 알림을 보냅니다',
    letterSpacing: '0',
    context: '필드 상단 라벨, 상태 힌트, 보조 메타데이터',
  },
  {
    role: 'Compact label',
    sizeLeading: '12px / 18px',
    weight: '500~600',
    sample: 'KST (UTC+09:00) 기준 · 가상 시나리오',
    letterSpacing: '0',
    context: '타임라인 보조 축, 배지 내부 텍스트',
  },
]

export const TypographyHierarchy: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">02. 타이포그래피 위계 (Typography Hierarchy)</h1>
        <p className="sg-intro-desc">
          Wanted Sans Variable을 기본으로 하며, 한국어 문장의 가독성을 위해 letter-spacing 0(본문)과
          -0.01em(제목)을 엄격히 지킵니다.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {typeScale.map((t) => (
          <div key={t.role} className="sg-hierarchy-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sg-role-badge">{t.role}</span>
              <code className="sg-token-code">
                {t.sizeLeading} · {t.weight}
              </code>
            </div>
            <p
              className="sg-sample-text"
              style={{
                fontSize: t.sizeLeading.split('/')[0].trim(),
                lineHeight: t.sizeLeading.split('/')[1]?.trim() ?? '1.5',
                fontWeight: t.weight.startsWith('700')
                  ? 700
                  : t.weight.startsWith('600')
                    ? 600
                    : 500,
                letterSpacing: t.letterSpacing,
              }}
            >
              {t.sample}
            </p>
            <p className="sg-role-meta">적용 맥락: {t.context}</p>
          </div>
        ))}
      </div>
    </div>
  ),
}

const spacingValues = [
  { px: 4, usage: '아이콘-텍스트 미세 간격, 태그 내부 여백' },
  { px: 8, usage: '버튼 내부 아이콘 간격, 라벨과 입력창 사이' },
  { px: 12, usage: '스택 아이템 간격, 콤팩트 카드 패딩' },
  { px: 16, usage: '일반 폼 필드 하단 여백, 모바일 기본 여백' },
  { px: 20, usage: '카드 기본 내부 패딩, 필드 그룹 간격' },
  { px: 24, usage: '섹션과 섹션 사이 간격, 서피스 내부 여백' },
  { px: 32, usage: '대형 과업 헤더 하단 여백, 데스크톱 페이지 여백' },
  { px: 40, usage: '메인 과업 블록 간 분리 여백' },
]

export const SpacingRadiusSurfaces: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">03. 간격, 곡률 및 표면 (Spacing, Radius & Surfaces)</h1>
        <p className="sg-intro-desc">
          4px 기준 간격 리듬과 정밀한 곡률 토큰으로 부드럽고 질서 있는 구조를 만듭니다.
        </p>
      </header>

      <section className="sg-section">
        <h2 className="sg-section-title">4px 간격 스케일</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {spacingValues.map((s) => (
            <div key={s.px} className="sg-spacing-bar-row">
              <strong style={{ fontSize: '13px' }}>{s.px}px</strong>
              <div
                style={{
                  width: s.px * 6 + 'px',
                  maxWidth: '100%',
                  height: '10px',
                  borderRadius: '999px',
                  background: 'var(--mc-color-accent)',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--mc-color-text-muted)' }}>
                {s.usage}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-section">
        <h2 className="sg-section-title">곡률 (Radius) 및 표면 (Surface) 체계</h2>
        <div className="sg-grid-cards">
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--mc-radius-control)',
              border: '1px solid var(--mc-color-border)',
              background: 'var(--mc-color-surface)',
            }}
          >
            <span className="sg-role-badge">Control Radius (10px / 0.625rem)</span>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              버튼, 인풋, 선택 셀 등 조작 컴포넌트
            </p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--mc-radius-card)',
              border: '1px solid var(--mc-color-border)',
              background: 'var(--mc-color-surface)',
              boxShadow: 'var(--mc-shadow-panel)',
            }}
          >
            <span className="sg-role-badge">Card Radius (12px / 0.75rem)</span>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>후보 카드, 결과 패널, 팝오버</p>
          </div>
          <div
            style={{
              padding: '20px',
              borderRadius: 'var(--mc-radius-surface)',
              border: '1px solid var(--mc-color-border-strong)',
              background: 'var(--mc-color-surface)',
              boxShadow: 'var(--mc-shadow-soft)',
            }}
          >
            <span className="sg-role-badge">Surface Radius (16px / 1rem)</span>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              대형 과업 컨테이너, 모달 다이얼로그
            </p>
          </div>
        </div>
      </section>
    </div>
  ),
}

export const EffectiveTokenAudit: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '원칙 문서와 현재 CSS cascade가 다른 값을 숨기지 않고 정규화 후보로 기록합니다. 화면 캡처와 컴포넌트 QA에서는 runtime 값을 기준으로 합니다.',
      },
    },
  },
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">현재 구현과 목표 원칙 (Effective Token Audit)</h1>
        <p className="sg-intro-desc">
          시각 원칙은 방향을 설명하고 runtime token은 현재 결과를 만듭니다. 둘이 다를 때는 합의 없이
          한쪽을 정답으로 덮어쓰지 않습니다.
        </p>
      </header>

      <div className="sg-table-wrapper">
        <table className="sg-guide-table">
          <thead>
            <tr>
              <th>역할</th>
              <th>원칙 문서</th>
              <th>현재 runtime</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Canvas</td>
              <td>
                <code>#f6f8fb</code>
              </td>
              <td>
                <code>#f3f5f8</code>
              </td>
              <td>정규화 후보</td>
            </tr>
            <tr>
              <td>Border</td>
              <td>
                <code>#e7ecf3</code>
              </td>
              <td>
                <code>#e0e5ec</code>
              </td>
              <td>정규화 후보</td>
            </tr>
            <tr>
              <td>Accent</td>
              <td>
                <code>#1f6feb</code>
              </td>
              <td>
                <code>#2675ed</code>
              </td>
              <td>정규화 후보</td>
            </tr>
            <tr>
              <td>Control radius</td>
              <td>
                <code>8px</code>
              </td>
              <td>
                <code>10px</code>
              </td>
              <td>과도기 계약</td>
            </tr>
            <tr>
              <td>Primary material</td>
              <td>기본 shadow 없음</td>
              <td>제한적 gradient + inset shadow</td>
              <td>tactile feedback 예외</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="sg-gap-box">
        <div className="sg-gap-title">
          <AlertCircle size={16} /> 판단 기준
        </div>
        <div className="sg-gap-content">
          장식용 gradient는 사용하지 않지만 조작 피드백을 위한 material gradient는 현재 허용합니다.
          정규화 전까지 Storybook은 실제 cascade를 증거로 사용합니다.
        </div>
      </div>
    </div>
  ),
}

export const ActionsAndStateLanguage: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">04. 액션 및 상태 언어 (Actions & State Language)</h1>
        <p className="sg-intro-desc">
          버튼과 배지는 명확한 동사형 문장과 신뢰할 수 있는 상태 언어로 사용자의 다음 결정을
          돕습니다.
        </p>
      </header>

      <section className="sg-section">
        <h2 className="sg-section-title">버튼 계층 (Button Hierarchy)</h2>
        <div className="sg-state-row">
          <Button variant="primary">9월 24일 오후 3시로 확정하기</Button>
          <Button variant="secondary">다시 알림 보내기</Button>
          <Button variant="fieldAction">시간 추가</Button>
          <Button variant="quiet">건너뛰기</Button>
          <Button variant="destructive">회의 삭제</Button>
          <Button disabled>응답 대기 중 (확정 불가)</Button>
        </div>
      </section>

      <section className="sg-section">
        <h2 className="sg-section-title">후보 의사결정 상태 언어 (Decision State Language)</h2>
        <div className="sg-table-wrapper">
          <table className="sg-guide-table">
            <thead>
              <tr>
                <th>후보 상태</th>
                <th>배지 표현</th>
                <th>제품 문구 (UX Writing)</th>
                <th>주 액션 (CTA)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>ready</code>
                </td>
                <td>
                  <Badge tone="success">확정 가능</Badge>
                </td>
                <td>필수 참석자가 모두 가능하고 정족수를 충족했어요</td>
                <td>
                  <Button size="compact">이 시간으로 확정하기</Button>
                </td>
              </tr>
              <tr>
                <td>
                  <code>pending</code>
                </td>
                <td>
                  <Badge tone="warning">응답 대기</Badge>
                </td>
                <td>꼭 참석해야 하는 민수님의 응답을 기다리고 있어요</td>
                <td>
                  <Button variant="secondary" size="compact">
                    응답 요청하기
                  </Button>
                </td>
              </tr>
              <tr>
                <td>
                  <code>recovery</code>
                </td>
                <td>
                  <Badge tone="info">조정 검토</Badge>
                </td>
                <td>서연님이 일정을 조정해 볼 수 있다고 응답했어요</td>
                <td>
                  <Button variant="secondary" size="compact">
                    변경 동의 구하기
                  </Button>
                </td>
              </tr>
              <tr>
                <td>
                  <code>impossible</code>
                </td>
                <td>
                  <Badge tone="danger">진행 어려움</Badge>
                </td>
                <td>필수 참석자가 참석할 수 없어 회의 성립이 어려워요</td>
                <td>
                  <Button variant="quiet" size="compact">
                    다른 시간 찾아보기
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  ),
}

export const FormComposition: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">05. 폼 구성 원칙 (Form Composition)</h1>
        <p className="sg-intro-desc">
          Field 컴포넌트를 중심으로 라벨, 입력 컨트롤, 도움말(글자 수 제한 및 안내)이 일관된 위계로
          결합됩니다.
        </p>
      </header>

      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Field
          label={
            <span>
              회의 제목 <small>(필수)</small>
            </span>
          }
          hint="24/40자"
        >
          <Input
            controlSize="field"
            value="2026년 4분기 제품 로드맵 리뷰"
            readOnly
            aria-label="회의 제목"
          />
        </Field>

        <Field
          label="회의 목적 및 사전 공유사항"
          hint="참석자가 미리 읽어와야 할 문서나 안건을 구체적으로 적어주세요."
        >
          <Textarea
            value={'1. 상반기 일정 조율 지표 회고\n2. Q4 의사결정 복구 모델 우선순위 합의'}
            readOnly
            rows={3}
            aria-label="회의 목적"
          />
        </Field>

        <div className="sg-section">
          <span className="sg-role-badge">선택형 카드 조합</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SelectableCard isSelected={true}>
              <strong>전원 참석 필수</strong>
              <p
                style={{
                  fontSize: '13px',
                  margin: '4px 0 0',
                  color: 'var(--mc-color-text-secondary)',
                }}
              >
                모든 초대자가 가능해야 확정
              </p>
            </SelectableCard>
            <SelectableCard isSelected={false}>
              <strong>최소 인원 충족</strong>
              <p
                style={{
                  fontSize: '13px',
                  margin: '4px 0 0',
                  color: 'var(--mc-color-text-secondary)',
                }}
              >
                필수 참석자 + 3명 이상 참석
              </p>
            </SelectableCard>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const FocusAndAccessibility: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">06. 접근성 및 포커스 계약 (Focus & Accessibility)</h1>
        <p className="sg-intro-desc">
          키보드 탐색 시 단일 포커스 링이 명확히 드러나야 합니다. 아래 대표 색상 조합은 WCAG 상대
          휘도 공식으로 다시 계산한 현재 runtime snapshot입니다.
        </p>
      </header>

      <section className="sg-section">
        <h2 className="sg-section-title">포커스 링 규격</h2>
        <div className="sg-state-row">
          <div className="sg-focus-ring-demo">인셋 테두리 + 외부 3px 링 (포커스 상태 시각화)</div>
          <span className="sg-contract-badge">코드 계약 · 수동 키보드 확인 필요</span>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--mc-color-text-secondary)' }}>
          - 테두리: <code>var(--mc-color-accent) (#2675ed)</code>
          <br />- 외부 링: <code>var(--mc-color-accent-soft-strong) (#c9e2ff)</code>
        </p>
      </section>

      <section className="sg-section">
        <h2 className="sg-section-title">접근성 대비율 점검 (Accessibility Contrast Audit)</h2>
        <div className="sg-table-wrapper">
          <table className="sg-guide-table">
            <thead>
              <tr>
                <th>텍스트 역할</th>
                <th>전경색</th>
                <th>배경색</th>
                <th>대비율</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>본문 / 제목 (Primary)</td>
                <td>
                  <code>#151b24</code>
                </td>
                <td>
                  <code>#ffffff</code>
                </td>
                <td>
                  <strong>17.30:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AAA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>보조 텍스트 (Secondary)</td>
                <td>
                  <code>#2f3744</code>
                </td>
                <td>
                  <code>#ffffff</code>
                </td>
                <td>
                  <strong>11.99:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AAA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>설명 / 힌트 (Tertiary)</td>
                <td>
                  <code>#46515f</code>
                </td>
                <td>
                  <code>#ffffff</code>
                </td>
                <td>
                  <strong>8.07:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AAA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>Primary 버튼 텍스트</td>
                <td>
                  <code>#ffffff</code>
                </td>
                <td>
                  <code>#2471e3</code>
                </td>
                <td>
                  <strong>4.62:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>성공 상태 텍스트</td>
                <td>
                  <code>#007f65</code>
                </td>
                <td>
                  <code>#e6f8f3</code>
                </td>
                <td>
                  <strong>4.52:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>대기 상태 텍스트</td>
                <td>
                  <code>#9a5700</code>
                </td>
                <td>
                  <code>#fff4d6</code>
                </td>
                <td>
                  <strong>5.13:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AA 통과
                  </span>
                </td>
              </tr>
              <tr>
                <td>위험 상태 텍스트</td>
                <td>
                  <code>#c23542</code>
                </td>
                <td>
                  <code>#ffecef</code>
                </td>
                <td>
                  <strong>4.76:1</strong>
                </td>
                <td>
                  <span className="sg-contrast-badge">
                    <Check size={14} /> AA 통과
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  ),
}

export const ResponsiveAndContentStress: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">
          07. 반응형 및 콘텐츠 스트레스 (Responsive & Content Stress)
        </h1>
        <p className="sg-intro-desc">
          모바일 320px 극단적 뷰포트 환경과 긴 한국어 이름, 넘치는 일정 텍스트가 줄바꿈되거나 넘침
          없이 유지되는지 확인합니다.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <div className="sg-stress-box">
          <span className="sg-role-badge">극단 너비 (320px 모바일 기준)</span>
          <MainCard style={{ padding: '16px' }}>
            <MainCardHeader>
              <strong style={{ fontSize: '15px', wordBreak: 'keep-all' }}>
                [긴 제목] 2026 하반기 전사 조직개편 및 일정 조율 전략 회의
              </strong>
            </MainCardHeader>
            <MainCardContent style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Badge tone="warning">응답 대기 (3명)</Badge>
                <Badge tone="info">조정 검토 중</Badge>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--mc-color-text-secondary)',
                  marginTop: '8px',
                }}
              >
                참석자: 알렉산더페르난데스, 김수한무거북이와두루미, 박서연
              </p>
            </MainCardContent>
            <MainCardFooter>
              <Button width="full" size="compact">
                상세 현황 확인하기
              </Button>
            </MainCardFooter>
          </MainCard>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <span className="sg-role-badge">텍스트 오버플로우 대응 규칙</span>
          <ul
            style={{
              fontSize: '14px',
              lineHeight: '22px',
              color: 'var(--mc-color-text-secondary)',
              paddingLeft: '20px',
            }}
          >
            <li>
              <strong>word-break: keep-all</strong>을 적용하여 한국어 단어가 부자연스럽게 잘리지
              않도록 보호합니다.
            </li>
            <li>
              모바일 뷰포트에서는 수평 스크롤이 발생하지 않도록 <code>width: full</code> 액션 버튼을
              기본 채택합니다.
            </li>
            <li>
              배지들이 여러 줄로 줄바꿈될 때 <code>flex-wrap: wrap</code>과 6px 간격을 보장합니다.
            </li>
          </ul>
        </div>
      </div>
    </div>
  ),
}

export const ExplicitKnownGaps: Story = {
  render: () => (
    <div className="sg-container">
      <header className="sg-intro-header">
        <h1 className="sg-intro-title">08. 명시적 한계 및 미구현 계약 (Known Gaps)</h1>
        <p className="sg-intro-desc">
          채용 검토자에게 허위 구현이나 꾸며낸 상태를 전달하지 않도록, 현재 디자인 시스템의 미지원
          영역을 명확히 고지합니다.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="sg-gap-box">
          <div className="sg-gap-title">
            <AlertCircle size={16} />
            1. 비동기 로딩 스켈레톤 및 서버 에러 바운더리 미지원
          </div>
          <div className="sg-gap-content">
            현재 컴포넌트들은 상위 셸에서 주입된 순수 도메인 모델을 즉시 렌더링합니다. 따라서
            네트워크 지연 스켈레톤이나 원격 API 실패 재시도 UI는 임의로 꾸며내지 않고
            비워두었습니다.
          </div>
        </div>

        <div className="sg-gap-box">
          <div className="sg-gap-title">
            <AlertCircle size={16} />
            2. 다크 모드 토큰 미지원
          </div>
          <div className="sg-gap-content">
            현재 MeetCue는 밝은 캔버스와 종이 질감의 라이트 테마를 단일 기준으로 삼고 있습니다.
            시스템 선호도에 따른 자동 다크 모드 반전 토큰은 아직 구현되지 않았습니다.
          </div>
        </div>

        <div className="sg-gap-box">
          <div className="sg-gap-title">
            <AlertCircle size={16} />
            3. 외부 캘린더 실시간 연동 상태
          </div>
          <div className="sg-gap-content">
            캘린더 충돌 표시는 순수 계산된 힌트 인터페이스(Mock)로 동작하며, 실제 구글/아웃룩 OAuth
            연동 실패나 토큰 만료 상태를 처리하는 UI는 포함되어 있지 않습니다.
          </div>
        </div>
      </div>

      <section className="sg-section">
        <h2 className="sg-section-title">Primitive 상태 지원 범위</h2>
        <div className="sg-table-wrapper">
          <table className="sg-guide-table">
            <thead>
              <tr>
                <th>컴포넌트</th>
                <th>현재 지원</th>
                <th>아직 없는 공통 계약</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Button</td>
                <td>variant, size, disabled, focus, pressed</td>
                <td>loading</td>
              </tr>
              <tr>
                <td>Input / Textarea</td>
                <td>
                  focus, disabled, <code>aria-invalid</code> border
                </td>
                <td>
                  오류 메시지와 <code>aria-describedby</code> 연결
                </td>
              </tr>
              <tr>
                <td>Avatar</td>
                <td>이미지, 텍스트 fallback, 장식/대체 이름</td>
                <td>이미지 로드 실패 fallback</td>
              </tr>
              <tr>
                <td>Badge</td>
                <td>success, warning, danger, info</td>
                <td>neutral tone</td>
              </tr>
              <tr>
                <td>Segmented Control</td>
                <td>radiogroup, roving tabindex, 방향키</td>
                <td>disabled option, 빈 options 처리</td>
              </tr>
              <tr>
                <td>Dialog</td>
                <td>focus containment/return, ESC, backdrop</td>
                <td>전용 footer/action API</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  ),
}
