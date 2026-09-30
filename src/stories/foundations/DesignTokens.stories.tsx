import type { CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

const semanticColors = [
  ['Canvas', '--mc-fill-canvas'],
  ['Surface', '--mc-color-surface'],
  ['Surface subtle', '--mc-color-surface-subtle'],
  ['Primary', '--mc-color-accent'],
  ['Primary soft', '--mc-color-accent-soft'],
  ['Success', '--mc-color-success'],
  ['Warning', '--mc-color-warning'],
  ['Danger', '--mc-color-danger'],
  ['Border', '--mc-color-border'],
  ['Text primary', '--mc-color-text-primary'],
] as const

const spacing = [4, 8, 12, 16, 20, 24, 32, 40] as const

const meta = {
  title: '01 Foundations/Design Tokens',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '제품 코드가 실제로 사용하는 semantic token을 렌더링합니다. 색상 이름이 아니라 역할로 연결해 상태 의미와 화면 재질을 함께 검토합니다.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
  width: 'min(100%, 960px)',
}

export const SemanticColors: Story = {
  render: () => (
    <div style={gridStyle}>
      {semanticColors.map(([label, token]) => (
        <article
          key={token}
          style={{
            overflow: 'hidden',
            border: '1px solid var(--mc-color-border)',
            borderRadius: 16,
            background: 'var(--mc-color-surface)',
          }}
        >
          <div
            aria-label={`${label} 색상 샘플`}
            style={{
              height: 88,
              background: `var(${token})`,
              borderBottom: '1px solid var(--mc-color-border)',
            }}
          />
          <div style={{ padding: 14 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>{label}</strong>
            <code style={{ fontSize: 12, color: 'var(--mc-color-text-tertiary)' }}>{token}</code>
          </div>
        </article>
      ))}
    </div>
  ),
}

export const TypeHierarchy: Story = {
  render: () => (
    <article style={{ display: 'grid', gap: 24, width: 'min(100%, 720px)' }}>
      <div>
        <span style={{ color: 'var(--mc-color-text-tertiary)', fontSize: 12 }}>Page title</span>
        <h1 style={{ fontSize: 32, lineHeight: 1.25 }}>응답을 바탕으로 시간을 정해요</h1>
      </div>
      <div>
        <span style={{ color: 'var(--mc-color-text-tertiary)', fontSize: 12 }}>Section title</span>
        <h2 style={{ fontSize: 22, lineHeight: 1.35 }}>필요한 동의를 비교해 보세요</h2>
      </div>
      <div>
        <span style={{ color: 'var(--mc-color-text-tertiary)', fontSize: 12 }}>Body</span>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--mc-color-text-secondary)' }}>
          미응답과 변경 의향을 구분하고, 확인된 답을 유지한 채 다음 행동을 안내합니다.
        </p>
      </div>
      <div>
        <span style={{ color: 'var(--mc-color-text-tertiary)', fontSize: 12 }}>Caption</span>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--mc-color-text-tertiary)' }}>
          Synthetic scenario · 사용자 효과 미검증
        </p>
      </div>
    </article>
  ),
}

export const SpacingRhythm: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 14, width: 'min(100%, 720px)' }}>
      {spacing.map((value) => (
        <div
          key={value}
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <code style={{ fontSize: 12 }}>{value}px</code>
          <div
            style={{
              width: value * 4,
              maxWidth: '100%',
              height: 12,
              borderRadius: 999,
              background: 'var(--mc-color-accent)',
            }}
          />
        </div>
      ))}
    </div>
  ),
}
