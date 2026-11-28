import { useRef } from 'react'
import { Button, Card, Tag } from '@lacuna/ui'
import { TIER_NAMES, type Bank } from './deck'
import { isRevealed, type Session } from './session'

export function CardView({ bank, s, onReveal, onMark, onSkip, onNext, onBack, onAward, onQuit }: {
  bank: Bank
  s: Session
  onReveal: () => void
  onMark: (m: 'got' | 'miss') => void
  onSkip: () => void
  onNext: () => void
  onBack: () => void
  onAward: (team: number) => void
  onQuit: () => void
}) {
  const card = s.cards[s.idx]!
  const revealed = isRevealed(s)
  const solo = s.mode === 'solo'
  const mark = s.marks[s.idx]
  const score = Object.values(s.marks).filter((m) => m === 'got').length
  const last = s.idx === s.cards.length - 1
  const start = useRef<number | null>(null)

  // Swipe on a revealed card: right is Got it, left is Missed it.
  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientX
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const from = start.current
    start.current = null
    if (from === null || !solo || !revealed) return
    const dx = e.clientX - from
    if (dx > 72) onMark('got')
    else if (dx < -72) onMark('miss')
  }

  return (
    <div className="pt-session">
      <div className="pt-head">
        <span className="lc-mono" aria-live="polite">{`Card ${s.idx + 1} of ${s.cards.length}`}</span>
        <span className="pt-tags">
          <Tag>{bank.categories[card.c]}</Tag>
          <Tag accent>{TIER_NAMES[card.t]}</Tag>
        </span>
        {solo ? <span className="lc-mono pt-score">{`Score ${score}`}</span> : null}
        <Button kind="ghost" onClick={onQuit}>End deck</Button>
      </div>
      <div className="pt-meter" aria-hidden="true"><div style={{ width: `${(s.idx / s.cards.length) * 100}%` }} /></div>

      <Card flush>
        <div className="pt-card" onPointerDown={onPointerDown} onPointerUp={onPointerUp} data-revealed={revealed}>
          {s.title ? <div className="lc-mono lc-mono-sm lc-faint">{s.title}</div> : null}
          <p className="pt-q">{card.q}</p>
          {revealed ? (
            <div className="pt-reveal">
              <div className="lc-mono lc-mono-sm lc-faint">Answer</div>
              <p className="pt-a">{card.a}</p>
              {card.n ? <p className="pt-note">{card.n}</p> : null}
              {mark === 'got' || mark === 'miss' ? <Tag accent={mark === 'got'}>{mark === 'got' ? 'Got it' : 'Missed it'}</Tag> : null}
            </div>
          ) : null}
        </div>
      </Card>

      {!solo && revealed && s.teams.length > 0 ? (
        <div className="pt-teams" role="group" aria-label="Award a point">
          {s.teams.map((name, i) => {
            const on = !!s.awards[s.idx]?.includes(i)
            const total = Object.values(s.awards).filter((a) => a.includes(i)).length
            return (
              <button key={i} type="button" className={`lc-btn ${on ? 'ink' : 'secondary'}`} aria-pressed={on} onClick={() => onAward(i)}>
                {`+1 ${name}`} <span className="lc-mono lc-mono-sm">{total}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="pt-bar">
        <Button kind="ghost" onClick={onBack} disabled={s.idx === 0}>Back</Button>
        {!revealed ? (
          <>
            <Button kind="ghost" onClick={onSkip}>Skip</Button>
            <Button kind="primary" onClick={onReveal}>Reveal answer</Button>
          </>
        ) : solo ? (
          <>
            <Button kind="ghost" onClick={onSkip}>Skip</Button>
            <Button onClick={() => onMark('miss')}>Missed it</Button>
            <Button kind="primary" onClick={() => onMark('got')}>Got it</Button>
          </>
        ) : (
          <Button kind="primary" onClick={onNext}>{last ? 'Finish deck' : 'Next card'}</Button>
        )}
      </div>
    </div>
  )
}
