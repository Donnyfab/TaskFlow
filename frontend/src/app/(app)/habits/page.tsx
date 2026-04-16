'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'

interface Habit {
  id: number; name: string; icon: string; frequency: string
  streak: number; completed_today: boolean
}
interface Data {
  habits: Habit[]; habits_done: number; habits_total: number
  best_streak: number; best_streak_name: string
  week_completion_pct: number; ai_insight: string
  activity_map: number[]; today_date: string
}

const EMOJIS = ['💪','📚','🚿','🌅','🧘','✍️','🎵','💧','🏃','🥗','😴','🎯']

export default function HabitsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/habits/data'), { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch habits')
      return res.json() as Promise<Data>
    },
  })

  const habits = data?.habits ?? []

  const [modal, setModal]     = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💪')
  const [newFreq, setNewFreq] = useState('Daily')
  const [saving, setSaving]   = useState(false)

  async function toggleHabit(id: number) {
    const previous = queryClient.getQueryData<Data>(['habits'])
    queryClient.setQueryData<Data>(['habits'], old => old ? {
      ...old,
      habits: old.habits.map(h =>
        h.id === id ? { ...h, completed_today: !h.completed_today, streak: h.completed_today ? Math.max(0, h.streak - 1) : h.streak + 1 } : h
      )
    } : old)
    try {
      await fetch(apiUrl(`/habits/${id}/toggle`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      })
    } catch {
      queryClient.setQueryData(['habits'], previous)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    }
  }

  async function deleteHabit(id: number) {
    if (!confirm('Delete this habit? Your streak will be lost.')) return
    const previous = queryClient.getQueryData<Data>(['habits'])
    queryClient.setQueryData<Data>(['habits'], old => old ? { ...old, habits: old.habits.filter(h => h.id !== id) } : old)
    try {
      await fetch(apiUrl(`/habits/${id}/delete`), { method: 'POST', credentials: 'include' })
    } catch {
      queryClient.setQueryData(['habits'], previous)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    }
  }

  async function createHabit() {
    if (!newName.trim()) return
    setSaving(true)
    const name = newName.trim()
    const tempHabit: Habit = { id: -Date.now(), name, icon: newIcon, frequency: newFreq, streak: 0, completed_today: false }
    const previous = queryClient.getQueryData<Data>(['habits'])
    queryClient.setQueryData<Data>(['habits'], old => old ? { ...old, habits: [...old.habits, tempHabit] } : old)
    setModal(false)
    setNewName('')
    setNewIcon('💪')
    setNewFreq('Daily')
    try {
      const res = await fetch(apiUrl('/habits/create'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `name=${encodeURIComponent(name)}&icon=${encodeURIComponent(newIcon)}&frequency=${encodeURIComponent(newFreq)}`
      })
      if (!res.ok) {
        queryClient.setQueryData(['habits'], previous)
      }
    } catch {
      queryClient.setQueryData(['habits'], previous)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      setSaving(false)
    }
  }

  const done  = habits.filter(h => h.completed_today).length
  const total = habits.length
  const activityMap = data?.activity_map ?? []

  const mapColor = (val: number) =>
    val < 0.15 ? 'rgba(255,255,255,0.05)'
    : val < 0.4 ? 'rgba(255,255,255,0.15)'
    : val < 0.7 ? 'rgba(255,255,255,0.32)'
    : 'rgba(255,255,255,0.55)'

  if (loading) return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', width: '120px' }} />
      {[1,2,3].map(i => <div key={i} style={{ height: '60px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />)}
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', minHeight: '100vh' }}>

      {/* TOPBAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 32px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-0.6px', color:'rgba(255,255,255,0.92)' }}>Habits</div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{data?.today_date} · {done}/{total} done today</div>
        </div>
        <button onClick={() => setModal(true)} style={{ background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'8px', padding:'8px 16px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
          + New habit
        </button>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', padding:'24px 32px 0' }}>
        {[
          { label:'Best streak', value: data?.best_streak ?? 0, sub: data?.best_streak_name ?? '' },
          { label:'Done today', value: done, sub2: `/${total}`, sub: `${total - done} still pending` },
          { label:'This week', value: data?.week_completion_pct ?? 0, sub2: '%', sub: 'Completion rate' },
          { label:'Total habits', value: total, sub: 'Active' },
        ].map(card => (
          <div key={card.label} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px' }}>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>{card.label}</div>
            <div style={{ fontSize:'26px', fontWeight:800, letterSpacing:'-1px', color:'rgba(255,255,255,0.9)', lineHeight:1, marginBottom:'3px' }}>
              {card.value}
              {card.sub2 && <span style={{ fontSize:'14px', fontWeight:400, color:'rgba(255,255,255,0.3)' }}>{card.sub2}</span>}
            </div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding:'24px 32px 40px', display:'grid', gridTemplateColumns:'1fr 300px', gap:'20px' }}>

        {/* HABIT LIST */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>Today's habits</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>{done} / {total} done</div>
          </div>

          {habits.length === 0 ? (
            <div style={{ padding:'48px 20px', textAlign:'center' }}>
              <div style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.35)', marginBottom:'6px' }}>No habits yet</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', lineHeight:1.6 }}>Add your first habit and start building consistency one day at a time.</div>
            </div>
          ) : (
            habits.map(habit => (
              <HabitRow key={habit.id} habit={habit} onToggle={toggleHabit} onDelete={deleteHabit} />
            ))
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* CONSISTENCY MAP */}
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'rgba(255,255,255,0.8)' }}>Consistency map</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>Last 91 days</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(13,1fr)', gap:'3px', padding:'14px 20px' }}>
              {Array.from({ length: 91 }, (_, i) => (
                <div key={i} style={{ height:'14px', borderRadius:'2px', background: mapColor(activityMap[i] ?? 0) }} />
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end', padding:'0 20px 14px' }}>
              <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.2)' }}>Less</span>
              {[0.05, 0.15, 0.32, 0.55].map(o => (
                <div key={o} style={{ width:'10px', height:'10px', borderRadius:'2px', background:`rgba(255,255,255,${o})` }} />
              ))}
              <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.2)' }}>More</span>
            </div>
          </div>

          {/* AI INSIGHT */}
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:'10px' }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'7px', background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', flexShrink:0 }}>✦</div>
              <div>
                <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.7)', marginBottom:'5px' }}>AI insight</div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.38)', lineHeight:1.65 }}>{data?.ai_insight}</div>
              </div>
            </div>
          </div>

          {/* BACK LINK */}
          <a href="/home" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'12px', fontSize:'12px', color:'rgba(255,255,255,0.38)', textDecoration:'none' }}>
            ← Back to dashboard
          </a>
        </div>
      </div>

      {/* ADD HABIT MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'28px', maxWidth:'420px', width:'90%' }}>
            <div style={{ fontSize:'16px', fontWeight:800, letterSpacing:'-0.4px', color:'rgba(255,255,255,0.9)', marginBottom:'20px' }}>New habit</div>

            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Habit name</div>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createHabit()}
                placeholder="e.g. Morning workout, Read 20 pages..."
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', padding:'10px 14px', fontSize:'13px', color:'#fff', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Icon</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {EMOJIS.map(emoji => (
                  <div key={emoji} onClick={() => setNewIcon(emoji)} style={{
                    width:'36px', height:'36px', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', cursor:'pointer',
                    background: newIcon === emoji ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    border: newIcon === emoji ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'10px', fontWeight:500, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'6px' }}>Frequency</div>
              <select value={newFreq} onChange={e => setNewFreq(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', padding:'10px 14px', fontSize:'13px', color:'#fff', outline:'none', boxSizing:'border-box' }}>
                <option value="Daily">Daily</option>
                <option value="Weekdays">Weekdays only</option>
                <option value="Weekends">Weekends only</option>
                <option value="3x/week">3x per week</option>
              </select>
            </div>

            <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
              <button onClick={() => setModal(false)} style={{ flex:1, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', padding:'10px', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={createHabit} disabled={saving} style={{ flex:1, background:'#fff', color:'#0A0A0A', border:'none', borderRadius:'9px', padding:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create habit →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HabitRow({ habit, onToggle, onDelete }: { habit: Habit; onToggle: (id:number)=>void; onDelete: (id:number)=>void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s', background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>
        {habit.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:500, color:'rgba(255,255,255,0.78)', marginBottom:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{habit.name}</div>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>
            {habit.streak >= 3 ? '🔥 ' : ''}{habit.streak} day streak
          </span>
          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.05)', borderRadius:'4px', padding:'1px 7px' }}>{habit.frequency}</span>
        </div>
      </div>

      {/* Mini bars */}
      <div style={{ display:'flex', gap:'3px', alignItems:'flex-end', flexShrink:0 }}>
        {[6,8,10,12,10,12,14].map((h, i) => (
          <div key={i} style={{ width:'5px', height:`${h}px`, borderRadius:'2px', background: i < habit.streak % 7 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.07)' }} />
        ))}
      </div>

      <button onClick={() => onToggle(habit.id)} style={{
        width:'28px', height:'28px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', flexShrink:0, transition:'all 0.15s',
        border: habit.completed_today ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
        background: habit.completed_today ? 'rgba(255,255,255,0.14)' : 'transparent',
        color: habit.completed_today ? 'rgba(255,255,255,0.8)' : 'transparent',
      }}>
        {habit.completed_today ? '✓' : ''}
      </button>

      {hovered && (
        <div onClick={() => onDelete(habit.id)} style={{ width:'22px', height:'22px', borderRadius:'6px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', cursor:'pointer', color:'rgba(255,100,100,0.7)', flexShrink:0 }}>✕</div>
      )}
    </div>
  )
}
