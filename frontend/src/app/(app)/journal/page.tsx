'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'
import SidebarReopenButton from '@/components/SidebarReopenButton'
import { useTheme } from '@/hooks/useTheme'

const THEMES = {
  dark: {
    sideBg:         'transparent',
    sideBorder:     'rgba(255,255,255,0.05)',
    titleColor:     'rgba(255,255,255,0.9)',
    searchBg:       'rgba(255,255,255,0.04)',
    searchBorder:   'rgba(255,255,255,0.08)',
    searchColor:    '#fff',
    newBtnBg:       '#fff',
    newBtnColor:    '#0A0A0A',
    emptyTitle:     'rgba(255,255,255,0.3)',
    emptyDesc:      'rgba(255,255,255,0.18)',
    entryActiveBg:  'rgba(255,255,255,0.05)',
    entryActiveLine:'rgba(255,255,255,0.4)',
    entryTitle:     'rgba(255,255,255,0.72)',
    entryPreview:   'rgba(255,255,255,0.28)',
    entryMeta:      'rgba(255,255,255,0.2)',
    editorBorder:   'rgba(255,255,255,0.05)',
    edTitle:        'rgba(255,255,255,0.9)',
    edMeta:         'rgba(255,255,255,0.28)',
    aiBtnBg:        'rgba(255,255,255,0.05)',
    aiBtnBorder:    'rgba(255,255,255,0.08)',
    aiBtnColor:     'rgba(255,255,255,0.5)',
    saveBtnBg:      '#fff',
    saveBtnColor:   '#0A0A0A',
    promptBg:       'rgba(255,255,255,0.03)',
    promptBorder:   'rgba(255,255,255,0.07)',
    promptTag:      'rgba(255,255,255,0.4)',
    promptTagBg:    'rgba(255,255,255,0.07)',
    promptText:     'rgba(255,255,255,0.4)',
    promptRotate:   'rgba(255,255,255,0.22)',
    textareaColor:  'rgba(255,255,255,0.78)',
    footerBorder:   'rgba(255,255,255,0.04)',
    footerMeta:     'rgba(255,255,255,0.22)',
    footerMoodLabel:'rgba(255,255,255,0.25)',
    moodSelBg:      'rgba(255,255,255,0.1)',
    moodSelBorder:  'rgba(255,255,255,0.25)',
    moodDefBg:      'rgba(255,255,255,0.04)',
    moodDefBorder:  'rgba(255,255,255,0.07)',
    emptyEdIcon:    0.22,
    emptyEdTitle:   'rgba(255,255,255,0.38)',
    emptyEdDesc:    'rgba(255,255,255,0.2)',
    emptyEdBtnBg:   '#fff',
    emptyEdBtnColor:'#0A0A0A',
    toastBg:        '#1a1a1a',
    toastBorder:    'rgba(255,255,255,0.1)',
    toastColor:     'rgba(255,255,255,0.7)',
  },
  light: {
    sideBg:         'transparent',
    sideBorder:     'rgba(0,0,0,0.07)',
    titleColor:     '#1a1a1a',
    searchBg:       '#F5F5F5',
    searchBorder:   'rgba(0,0,0,0.1)',
    searchColor:    '#1a1a1a',
    newBtnBg:       '#1a1a1a',
    newBtnColor:    '#fff',
    emptyTitle:     'rgba(0,0,0,0.4)',
    emptyDesc:      'rgba(0,0,0,0.28)',
    entryActiveBg:  'rgba(0,0,0,0.04)',
    entryActiveLine:'rgba(0,0,0,0.35)',
    entryTitle:     '#1a1a1a',
    entryPreview:   'rgba(0,0,0,0.45)',
    entryMeta:      'rgba(0,0,0,0.35)',
    editorBorder:   'rgba(0,0,0,0.07)',
    edTitle:        '#1a1a1a',
    edMeta:         'rgba(0,0,0,0.4)',
    aiBtnBg:        'rgba(0,0,0,0.04)',
    aiBtnBorder:    'rgba(0,0,0,0.08)',
    aiBtnColor:     'rgba(0,0,0,0.5)',
    saveBtnBg:      '#1a1a1a',
    saveBtnColor:   '#fff',
    promptBg:       '#FFFFFF',
    promptBorder:   'rgba(0,0,0,0.08)',
    promptTag:      'rgba(0,0,0,0.4)',
    promptTagBg:    'rgba(0,0,0,0.06)',
    promptText:     'rgba(0,0,0,0.45)',
    promptRotate:   'rgba(0,0,0,0.3)',
    textareaColor:  '#1a1a1a',
    footerBorder:   'rgba(0,0,0,0.06)',
    footerMeta:     'rgba(0,0,0,0.35)',
    footerMoodLabel:'rgba(0,0,0,0.35)',
    moodSelBg:      'rgba(0,0,0,0.08)',
    moodSelBorder:  'rgba(0,0,0,0.22)',
    moodDefBg:      'rgba(0,0,0,0.04)',
    moodDefBorder:  'rgba(0,0,0,0.07)',
    emptyEdIcon:    0.18,
    emptyEdTitle:   'rgba(0,0,0,0.4)',
    emptyEdDesc:    'rgba(0,0,0,0.3)',
    emptyEdBtnBg:   '#1a1a1a',
    emptyEdBtnColor:'#fff',
    toastBg:        '#FFFFFF',
    toastBorder:    'rgba(0,0,0,0.1)',
    toastColor:     'rgba(0,0,0,0.7)',
  },
}

interface Entry { id: number; title: string; preview: string; word_count: number; time_label: string; content: string }

const PROMPTS = [
  "What's one thing you want to accomplish today — and why does it matter?",
  "What made today different? How do you replicate it tomorrow?",
  "What's one thing you avoided today that you know you need to face?",
  "Describe your energy level today from 1–10 and what influenced it most.",
  "What would the best version of you say about how you spent today?",
  "What small win happened today that you almost didn't notice?",
  "If you could redo one decision from today, what would it be and why?",
]

export default function JournalPage() {
  const queryClient = useQueryClient()
  const theme = useTheme()
  const th = THEMES[theme]

  const { data, isLoading: loading } = useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/journal/entries'), { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch journal entries')
      return res.json() as Promise<{ entries: Entry[] }>
    },
  })

  const entries = data?.entries ?? []

  const [active, setActive]           = useState<Entry | null>(null)
  const [content, setContent]         = useState('')
  const [search, setSearch]           = useState('')
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const [showToast, setShowToast]     = useState(false)
  const [promptIdx, setPromptIdx]     = useState(0)
  const [aiInsight, setAiInsight]     = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [mood, setMood]               = useState('')
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef   = useRef<Entry | null>(null)
  const contentRef  = useRef('')
  const initializedRef = useRef(false)

  activeRef.current  = active
  contentRef.current = content

  // Select the first entry once data loads (only on first load)
  useEffect(() => {
    if (!initializedRef.current && entries.length > 0) {
      initializedRef.current = true
      setActive(entries[0])
      setContent(entries[0].content)
    }
  }, [entries])

  const fireToast = (msg: string) => {
    setToast(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2200)
  }

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      const cur = activeRef.current
      const txt = contentRef.current
      if (!cur || !txt.trim()) return
      await fetch(apiUrl(`/api/journal/save/${cur.id}`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: txt })
      })
      fireToast('Auto-saved')
      queryClient.invalidateQueries({ queryKey: ['journal'] })
    }, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [queryClient])

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveEntry() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  async function newEntry() {
    const tempId = -Date.now()
    const tempEntry: Entry = { id: tempId, title: 'New Entry', preview: '', word_count: 0, time_label: 'Just now', content: '' }
    const previous = queryClient.getQueryData<{ entries: Entry[] }>(['journal'])
    queryClient.setQueryData<{ entries: Entry[] }>(['journal'], old => old ? { entries: [tempEntry, ...old.entries] } : old)
    setActive(tempEntry)
    setContent('')
    setMood('')
    setAiInsight('')
    try {
      const res = await fetch(apiUrl('/api/journal/new'), { method: 'POST', credentials: 'include' })
      const d = await res.json()
      const realEntry: Entry = { id: d.id, title: d.title, preview: '', word_count: 0, time_label: '', content: '' }
      queryClient.setQueryData<{ entries: Entry[] }>(['journal'], old => old ? {
        entries: old.entries.map(e => e.id === tempId ? realEntry : e)
      } : old)
      setActive(realEntry)
    } catch {
      queryClient.setQueryData(['journal'], previous)
      setActive(null)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['journal'] })
    }
  }

  function selectEntry(entry: Entry) {
    setActive(entry)
    setContent(entry.content)
    setMood('')
    setAiInsight('')
  }

  async function saveEntry() {
    if (!active) return
    setSaving(true)
    const preview = content.slice(0, 80)
    const word_count = countWords(content)
    const previous = queryClient.getQueryData<{ entries: Entry[] }>(['journal'])
    queryClient.setQueryData<{ entries: Entry[] }>(['journal'], old => old ? {
      entries: old.entries.map(e => e.id === active.id ? { ...e, content, preview, word_count } : e)
    } : old)
    try {
      await fetch(apiUrl(`/api/journal/save/${active.id}`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      fireToast('Saved')
    } catch {
      queryClient.setQueryData(['journal'], previous)
      fireToast('Save failed')
    } finally {
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['journal'] })
    }
  }

  async function getAIInsight() {
    if (!content.trim() || content.trim().length < 20) { fireToast('Write a bit more first'); return }
    setAiLoading(true)
    setAiInsight('')
    try {
      const res = await fetch(apiUrl('/ai/journal-insight'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      const d = await res.json()
      setAiInsight(d.insight || 'Keep writing — your consistency is building something real.')
    } catch {
      setAiInsight('Keep writing — your consistency is building something real.')
    }
    setAiLoading(false)
  }

  function countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  const wc = countWords(content)
  const filtered = entries.filter(e =>
    !search || (e.title + ' ' + e.content).toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', minHeight:'100vh' }}>
      <div style={{ borderRight:`1px solid ${th.sideBorder}`, padding:'22px 20px' }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height:'60px', background:'rgba(128,128,128,0.06)', borderRadius:'8px', marginBottom:'4px' }}/>)}
      </div>
      <div style={{ padding:'32px' }}>
        <div style={{ height:'400px', background:'rgba(128,128,128,0.04)', borderRadius:'12px' }}/>
      </div>
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px minmax(0,1fr)', minHeight:'100vh' }}>

      {/* ENTRIES LIST */}
      <div style={{ borderRight:`1px solid ${th.sideBorder}`, display:'flex', flexDirection:'column', height:'100vh', overflowY:'auto' }}>
        <div style={{ padding:'22px 20px 0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
            <SidebarReopenButton />
            <div style={{ fontSize:'17px', fontWeight:800, letterSpacing:'-0.5px', color: th.titleColor }}>Journal</div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..."
            style={{ width:'100%', background: th.searchBg, border:`1px solid ${th.searchBorder}`, borderRadius:'8px', padding:'7px 12px', fontSize:'12px', color: th.searchColor, outline:'none', marginBottom:'12px', boxSizing:'border-box' }}
          />
          <button onClick={newEntry} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', background: th.newBtnBg, color: th.newBtnColor, border:'none', borderRadius:'8px', padding:'9px 14px', fontSize:'12px', fontWeight:600, cursor:'pointer', width:'100%', marginBottom:'16px' }}>
            + New entry
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding:'32px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'13px', color: th.emptyTitle, marginBottom:'4px' }}>No entries yet</div>
            <div style={{ fontSize:'11px', color: th.emptyDesc, lineHeight:1.6 }}>Start writing. Every entry builds a record of who you're becoming.</div>
          </div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} onClick={() => selectEntry(entry)} style={{
              padding:'11px 20px', cursor:'pointer', transition:'background 0.15s',
              background: active?.id === entry.id ? th.entryActiveBg : 'transparent',
              borderLeft: active?.id === entry.id ? `2px solid ${th.entryActiveLine}` : '2px solid transparent',
            }}>
              <div style={{ fontSize:'12px', fontWeight:600, color: th.entryTitle, marginBottom:'3px' }}>{entry.title}</div>
              <div style={{ fontSize:'11px', color: th.entryPreview, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.4 }}>{entry.preview || 'No content yet'}</div>
              <div style={{ fontSize:'10px', color: th.entryMeta, marginTop:'3px' }}>
                {entry.time_label}{entry.word_count > 0 ? ` · ${entry.word_count} words` : ''}
              </div>
            </div>
          ))
        )}
      </div>

      {/* EDITOR */}
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        {active ? (
          <>
            {/* Topbar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 32px', borderBottom:`1px solid ${th.editorBorder}`, flexShrink:0 }}>
              <div>
                <div style={{ fontSize:'16px', fontWeight:800, letterSpacing:'-0.4px', color: th.edTitle }}>{active.title}</div>
                <div style={{ fontSize:'11px', color: th.edMeta, marginTop:'2px' }}>Journal entry · {wc} words</div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <button onClick={getAIInsight} disabled={aiLoading}
                  style={{ background: th.aiBtnBg, border:`1px solid ${th.aiBtnBorder}`, borderRadius:'7px', padding:'7px 13px', fontSize:'12px', color: th.aiBtnColor, cursor:'pointer', opacity: aiLoading ? 0.6 : 1 }}>
                  {aiLoading ? '...' : '✦ AI insight'}
                </button>
                <button onClick={saveEntry} disabled={saving}
                  style={{ background: th.saveBtnBg, color: th.saveBtnColor, border:'none', borderRadius:'7px', padding:'7px 16px', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save entry'}
                </button>
              </div>
            </div>

            {/* AI Prompt bar */}
            <div style={{ margin:'18px 32px 0', background: th.promptBg, border:`1px solid ${th.promptBorder}`, borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:'10px', flexShrink:0 }}>
              <div style={{ fontSize:'10px', color: th.promptTag, background: th.promptTagBg, borderRadius:'6px', padding:'3px 7px', flexShrink:0, marginTop:'1px' }}>✦</div>
              <div style={{ fontSize:'12px', color: th.promptText, lineHeight:1.6, flex:1, fontStyle:'italic' }}>
                {aiInsight || PROMPTS[promptIdx]}
              </div>
              <div onClick={() => { setPromptIdx(i => (i+1) % PROMPTS.length); setAiInsight('') }}
                style={{ fontSize:'12px', color: th.promptRotate, cursor:'pointer', flexShrink:0, paddingTop:'1px' }}>↺</div>
            </div>

            {/* Textarea */}
            <div style={{ flex:1, padding:'24px 32px 16px', display:'flex', flexDirection:'column' }}>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Start writing your thoughts..."
                style={{ flex:1, width:'100%', background:'transparent', border:'none', outline:'none', fontSize:'15px', color: th.textareaColor, fontFamily:'inherit', resize:'none', lineHeight:1.85, minHeight:'360px' }}
              />
            </div>

            {/* Footer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 32px 24px', borderTop:`1px solid ${th.footerBorder}`, flexShrink:0 }}>
              <div style={{ fontSize:'11px', color: th.footerMeta }}>{wc} word{wc !== 1 ? 's' : ''}</div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ fontSize:'11px', color: th.footerMoodLabel, marginRight:'2px' }}>Mood:</div>
                {[['😊','great'],['😐','okay'],['😴','tired'],['😤','stressed'],['🔥','motivated']].map(([emoji, key]) => (
                  <div key={key} onClick={() => setMood(mood === key ? '' : key)} style={{
                    width:'28px', height:'28px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', cursor:'pointer',
                    background: mood === key ? th.moodSelBg : th.moodDefBg,
                    border: mood === key ? `1px solid ${th.moodSelBorder}` : `1px solid ${th.moodDefBorder}`,
                  }}>{emoji}</div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:'18px 32px', borderBottom:'none' }}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', padding:'40px', textAlign:'center' }}>
              <div style={{ fontSize:'28px', opacity: th.emptyEdIcon }}>✎</div>
              <div style={{ fontSize:'15px', fontWeight:600, color: th.emptyEdTitle }}>Select an entry or start fresh</div>
              <div style={{ fontSize:'12px', color: th.emptyEdDesc, lineHeight:1.65, maxWidth:'260px' }}>Pick an entry from the list, or write a new one. Every word is a step toward clarity.</div>
              <button onClick={newEntry} style={{ background: th.emptyEdBtnBg, color: th.emptyEdBtnColor, border:'none', borderRadius:'9px', padding:'10px 22px', fontSize:'13px', fontWeight:600, cursor:'pointer', marginTop:'8px' }}>
                + Write today's entry
              </button>
            </div>
          </>
        )}
      </div>

      {/* TOAST */}
      <div style={{
        position:'fixed', bottom:'24px', right:'24px', background: th.toastBg,
        border:`1px solid ${th.toastBorder}`, borderRadius:'10px', padding:'10px 16px',
        fontSize:'12px', color: th.toastColor, display:'flex', alignItems:'center', gap:'8px',
        transform: showToast ? 'translateY(0)' : 'translateY(80px)',
        opacity: showToast ? 1 : 0, transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', pointerEvents:'none', zIndex:999,
      }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(100,220,130,0.9)', flexShrink:0 }}/>
        {toast}
      </div>
    </div>
  )
}
