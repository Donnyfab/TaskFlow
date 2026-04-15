import { Suspense } from 'react'

import TasksPageClient from './TasksPageClient'

function TasksPageFallback() {
  return (
    <div style={{ padding:'32px', color:'rgba(255,255,255,0.2)', fontSize:'13px', display:'flex', gap:'32px' }}>
      <div style={{ width:'240px' }}>
        <div style={{ height:'20px', background:'rgba(255,255,255,0.05)', borderRadius:'6px', marginBottom:'16px', width:'80px' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height:'32px', background:'rgba(255,255,255,0.04)', borderRadius:'6px', marginBottom:'4px' }} />
        ))}
      </div>
      <div style={{ flex:1 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height:'44px', background:'rgba(255,255,255,0.04)', borderRadius:'10px', marginBottom:'4px' }} />
        ))}
      </div>
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageClient />
    </Suspense>
  )
}
