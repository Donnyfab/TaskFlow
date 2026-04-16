'use client'

import { useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-base'

interface Task {
  id: number; title: string; completed: boolean; priority: string
  list_id: number | null; list_name: string; pinned: boolean; description: string
}
interface TaskList { id: number; name: string; pinned: boolean; task_count: number }
interface Data {
  lists: TaskList[]; tasks: Task[]; active_list_id: number | null; all_tasks_count: number
}

const s = {
  main:       { display:'grid', gridTemplateColumns:'240px minmax(0,1fr)', minHeight:'100vh', minWidth:0 } as React.CSSProperties,
  lsSidebar:  { borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column' as const, height:'100vh', overflow:'hidden' },
  lsHeader:   { padding:'24px 20px 16px', background:'#0A0A0A', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  lsTitle:    { fontSize:'17px', fontWeight:800, letterSpacing:'-0.5px', marginBottom:'16px', color:'rgba(255,255,255,0.92)' },
  lsScroll:   { flex:1, overflowY:'auto' as const, paddingBottom:'20px' },
  lsSection:  { fontSize:'9px', fontWeight:600, color:'rgba(255,255,255,0.22)', textTransform:'uppercase' as const, letterSpacing:'0.8px', padding:'0 20px', marginBottom:'4px', marginTop:'12px' },
  panel:      { background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', overflow:'hidden' },
}

export default function TasksPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listId = searchParams.get('list_id') ? Number(searchParams.get('list_id')) : null

  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ['tasks', listId],
    queryFn: async () => {
      const url = listId
        ? apiUrl(`/api/tasks/data?list_id=${listId}`)
        : apiUrl('/api/tasks/data')
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json() as Promise<Data>
    },
  })

  const [localTasks, setLocalTasks] = useState<Task[]>([])
  const tasks = localTasks.length > 0 || !data ? localTasks : data.tasks

  const [filter, setFilter]         = useState<'all'|'active'|'completed'>('all')
  const [newTask, setNewTask]        = useState('')
  const [newList, setNewList]        = useState('')
  const [detail, setDetail]          = useState<Task | null>(null)
  const [dpTitle, setDpTitle]        = useState('')
  const [dpNotes, setDpNotes]        = useState('')
  const [dpPriority, setDpPriority]  = useState('medium')
  const [dpListId, setDpListId]      = useState<number|null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  async function addTask() {
    if (!newTask.trim()) return
    const title = newTask.trim()
    setNewTask('')
    const temp: Task = { id: Date.now(), title, completed:false, priority:'medium', list_id:listId, list_name:'Task', pinned:false, description:'' }
    setLocalTasks(prev => [temp, ...(prev.length ? prev : (data?.tasks ?? []))])
    const res = await fetch(apiUrl('/tasks/quick'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, list_id: listId })
    })
    const created = await res.json()
    if (created.id) setLocalTasks(prev => prev.map(t => t.id === temp.id ? {...temp, id:created.id} : t))
    else setLocalTasks(prev => prev.filter(t => t.id !== temp.id))
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] })
  }

  async function toggleTask(id: number) {
    setLocalTasks(prev =>
      (prev.length ? prev : (data?.tasks ?? [])).map(t => t.id === id ? {...t, completed:!t.completed} : t)
    )
    await fetch(apiUrl(`/tasks/toggle/${id}`), { method:'POST', credentials:'include', headers:{'X-Requested-With':'XMLHttpRequest'} })
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] })
  }

  async function deleteTask(id: number) {
    setLocalTasks(prev =>
      (prev.length ? prev : (data?.tasks ?? [])).filter(t => t.id !== id)
    )
    if (detail?.id === id) setDetail(null)
    await fetch(apiUrl(`/tasks/delete/${id}`), { method:'POST', credentials:'include' })
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] })
  }

  async function addList() {
    if (!newList.trim()) return
    const name = newList.trim()
    setNewList('')
    const res = await fetch(apiUrl('/lists/create'), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: `name=${encodeURIComponent(name)}`
    })
    if (res.ok) {
      const url = res.url
      const listIdMatch = url.match(/list_id=(\d+)/)
      if (listIdMatch) router.push(`/tasks?list_id=${listIdMatch[1]}`)
      else queryClient.invalidateQueries({ queryKey: ['tasks', listId] })
    }
  }

  async function saveDetail() {
    if (!detail) return
    const res = await fetch(apiUrl(`/tasks/update/${detail.id}`), {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json', 'X-Requested-With':'XMLHttpRequest', 'Accept':'application/json'},
      body: JSON.stringify({ title:dpTitle, description:dpNotes, priority:dpPriority, list_id:dpListId })
    })
    const result = await res.json()
    if (result.ok) {
      setLocalTasks(prev =>
        (prev.length ? prev : (data?.tasks ?? [])).map(t =>
          t.id === detail.id ? {...t, title:dpTitle, description:dpNotes, priority:dpPriority, list_id:dpListId} : t
        )
      )
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] })
    }
  }

  function openDetail(task: Task) {
    setDetail(task)
    setDpTitle(task.title)
    setDpNotes(task.description)
    setDpPriority(task.priority)
    setDpListId(task.list_id)
  }

  const incomplete = tasks.filter(t => !t.completed)
  const completed  = tasks.filter(t => t.completed)
  const priorityColor = (p: string) =>
    p === 'high' ? {bg:'rgba(255,80,80,0.08)',color:'rgba(255,120,120,0.65)'}
    : p === 'medium' ? {bg:'rgba(255,180,50,0.08)',color:'rgba(255,200,80,0.6)'}
    : {bg:'rgba(100,200,100,0.08)',color:'rgba(120,200,120,0.6)'}

  if (loading) return (
    <div style={{padding:'32px',color:'rgba(255,255,255,0.2)',fontSize:'13px',display:'flex',gap:'32px'}}>
      <div style={{width:'240px'}}>
        <div style={{height:'20px',background:'rgba(255,255,255,0.05)',borderRadius:'6px',marginBottom:'16px',width:'80px'}}/>
        {[1,2,3].map(i=><div key={i} style={{height:'32px',background:'rgba(255,255,255,0.04)',borderRadius:'6px',marginBottom:'4px'}}/>)}
      </div>
      <div style={{flex:1}}>
        {[1,2,3,4].map(i=><div key={i} style={{height:'44px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',marginBottom:'4px'}}/>)}
      </div>
    </div>
  )

  return (
    <div style={s.main}>

      {/* LISTS SIDEBAR */}
      <div style={s.lsSidebar}>
        <div style={s.lsHeader}>
          <div style={s.lsTitle}>Tasks</div>
          <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
            <input
              value={newList}
              onChange={e=>setNewList(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addList()}
              placeholder="New list..."
              style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'7px 10px',fontSize:'12px',color:'#fff',outline:'none'}}
            />
            <button onClick={addList} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0 12px',fontSize:'12px',color:'rgba(255,255,255,0.6)',cursor:'pointer',whiteSpace:'nowrap'}}>+ Add</button>
          </div>
        </div>

        <div style={s.lsScroll}>
          <div style={s.lsSection}>My lists</div>

          <a href="/tasks" onClick={e=>{e.preventDefault();router.push('/tasks')}} style={{
            display:'flex',alignItems:'center',gap:'8px',padding:'7px 20px',fontSize:'13px',textDecoration:'none',
            color: !listId ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.45)',
            background: !listId ? 'rgba(255,255,255,0.05)' : 'transparent',
            borderLeft: !listId ? '2px solid rgba(255,255,255,0.45)' : '2px solid transparent',
          }}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'rgba(255,255,255,0.3)',flexShrink:0}}/>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>All tasks</span>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.22)',background:'rgba(255,255,255,0.06)',borderRadius:'4px',padding:'1px 6px'}}>{data?.all_tasks_count ?? 0}</div>
          </a>

          {data?.lists.map(lst => (
            <a key={lst.id} href={`/tasks?list_id=${lst.id}`}
              onClick={e=>{e.preventDefault();router.push(`/tasks?list_id=${lst.id}`)}}
              style={{
                display:'flex',alignItems:'center',gap:'8px',padding:'7px 20px',fontSize:'13px',textDecoration:'none',
                color: listId===lst.id ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.45)',
                background: listId===lst.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: listId===lst.id ? '2px solid rgba(255,255,255,0.45)' : '2px solid transparent',
              }}>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'rgba(100,160,255,0.5)',flexShrink:0}}/>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lst.name}</span>
              {lst.pinned && <span style={{fontSize:'10px',color:'rgba(255,255,255,0.32)'}}>📌</span>}
              <div style={{fontSize:'10px',color:'rgba(255,255,255,0.22)',background:'rgba(255,255,255,0.06)',borderRadius:'4px',padding:'1px 6px'}}>{lst.task_count}</div>
            </a>
          ))}
        </div>
      </div>

      {/* TASK CONTENT */}
      <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',minWidth:0}}>

        {/* Header */}
        <div style={{padding:'20px 32px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
            <div>
              <div style={{fontSize:'20px',fontWeight:800,letterSpacing:'-0.6px',color:'rgba(255,255,255,0.92)'}}>
                {data?.lists.find(l=>l.id===listId)?.name ?? 'All tasks'}
              </div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',marginTop:'2px'}}>
                {tasks.length} task{tasks.length!==1?'s':''} · {completed.length} completed
              </div>
            </div>
            <button onClick={()=>document.getElementById('quick-inp')?.focus()}
              style={{background:'#fff',color:'#0A0A0A',border:'none',borderRadius:'7px',padding:'6px 14px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
              + Add task
            </button>
          </div>

          <div style={{display:'flex',gap:0}}>
            {(['all','active','completed'] as const).map(f=>(
              <div key={f} onClick={()=>setFilter(f)} style={{
                padding:'10px 14px',fontSize:'12px',cursor:'pointer',
                color: filter===f ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                borderBottom: filter===f ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                transition:'all 0.15s',
              }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Add task bar */}
        <div style={{padding:'16px 32px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{display:'flex',gap:'10px'}}>
            <input id="quick-inp" value={newTask} onChange={e=>setNewTask(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addTask()}
              placeholder="Add a new task — press Enter to save..."
              style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'10px 14px',fontSize:'13px',color:'#fff',outline:'none'}}
            />
            <button onClick={addTask}
              style={{background:'#fff',color:'#0A0A0A',border:'none',borderRadius:'8px',padding:'9px 18px',fontSize:'12px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              Add task
            </button>
          </div>
        </div>

        {/* Task list */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 32px 40px',minWidth:0}}>
          {tasks.length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 32px',gap:'10px',textAlign:'center'}}>
              <div style={{fontSize:'28px',opacity:0.25}}>✓</div>
              <div style={{fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.4)'}}>No tasks yet</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.22)',lineHeight:1.6,maxWidth:'240px'}}>Add your first task above and start building momentum.</div>
            </div>
          ) : (
            <>
              {(filter==='all'||filter==='active') && incomplete.length > 0 && (
                <>
                  <div style={{fontSize:'9px',fontWeight:600,color:'rgba(255,255,255,0.22)',textTransform:'uppercase',letterSpacing:'0.7px',padding:'14px 0 6px'}}>Active</div>
                  {incomplete.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onOpen={openDetail} priorityColor={priorityColor}/>)}
                </>
              )}
              {(filter==='all'||filter==='completed') && completed.length > 0 && (
                <>
                  <div style={{fontSize:'9px',fontWeight:600,color:'rgba(255,255,255,0.22)',textTransform:'uppercase',letterSpacing:'0.7px',padding:'14px 0 6px'}}>Completed</div>
                  {completed.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onOpen={openDetail} priorityColor={priorityColor}/>)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* DETAIL PANEL */}
      <div ref={detailRef} style={{
        position:'fixed',right:0,top:0,bottom:0,width:'340px',background:'#0F0F0F',
        borderLeft:'1px solid rgba(255,255,255,0.08)',zIndex:50,
        transform: detail ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display:'flex',flexDirection:'column',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Task details</div>
          <button onClick={()=>setDetail(null)} style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'12px'}}>✕</button>
        </div>
        <div style={{flex:1,padding:'20px',overflowY:'auto'}}>
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:'6px'}}>Title</div>
            <input value={dpTitle} onChange={e=>setDpTitle(e.target.value)}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'#fff',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:'6px'}}>Notes</div>
            <textarea value={dpNotes} onChange={e=>setDpNotes(e.target.value)} rows={3}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',fontSize:'12px',color:'rgba(255,255,255,0.6)',outline:'none',resize:'none',lineHeight:1.6,fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:'6px'}}>Priority</div>
            <select value={dpPriority} onChange={e=>setDpPriority(e.target.value)}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',fontSize:'12px',color:'rgba(255,255,255,0.6)',outline:'none',cursor:'pointer',boxSizing:'border-box'}}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:'6px'}}>List</div>
            <select value={dpListId??''} onChange={e=>setDpListId(e.target.value?Number(e.target.value):null)}
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',fontSize:'12px',color:'rgba(255,255,255,0.6)',outline:'none',cursor:'pointer',boxSizing:'border-box'}}>
              {data?.lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:'8px'}}>
          <button onClick={saveDetail} style={{flex:1,background:'#fff',color:'#0A0A0A',border:'none',borderRadius:'8px',padding:'9px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>Save changes</button>
          <button onClick={()=>detail&&deleteTask(detail.id)} style={{background:'rgba(255,50,50,0.07)',border:'1px solid rgba(255,50,50,0.14)',borderRadius:'8px',padding:'9px 14px',fontSize:'12px',color:'rgba(255,100,100,0.7)',cursor:'pointer'}}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete, onOpen, priorityColor }: {
  task: Task
  onToggle: (id:number)=>void
  onDelete: (id:number)=>void
  onOpen: (task:Task)=>void
  priorityColor: (p:string)=>{bg:string,color:string}
}) {
  const pc = priorityColor(task.priority)
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      onClick={()=>onOpen(task)}
      style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 12px',borderRadius:'10px',cursor:'pointer',background:hovered?'rgba(255,255,255,0.03)':'transparent',marginBottom:'1px',position:'relative'}}>
      <div onClick={e=>{e.stopPropagation();onToggle(task.id)}} style={{
        width:'16px',height:'16px',borderRadius:'50%',flexShrink:0,marginTop:'1px',cursor:'pointer',
        border: task.completed ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
        background: task.completed ? 'rgba(255,255,255,0.18)' : 'transparent',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',
      }}>
        {task.completed && '✓'}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'13px',color:task.completed?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.75)',textDecoration:task.completed?'line-through':'none',lineHeight:1.4}}>{task.title}</div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px',flexWrap:'wrap'}}>
          {task.pinned && <span style={{fontSize:'10px',color:'rgba(255,255,255,0.32)'}}>📌</span>}
          <span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'4px',background:pc.bg,color:pc.color}}>{task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
          <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.3)'}}>{task.list_name||'Task'}</span>
        </div>
      </div>
      {hovered && (
        <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {!task.completed && (
            <div onClick={()=>onToggle(task.id)} style={{width:'24px',height:'24px',borderRadius:'6px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',cursor:'pointer'}}>✓</div>
          )}
          <div onClick={()=>onDelete(task.id)} style={{width:'24px',height:'24px',borderRadius:'6px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',cursor:'pointer',color:'rgba(255,100,100,0.7)'}}>✕</div>
        </div>
      )}
    </div>
  )
}
