'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export default function LandingPage() {
  const router = useRouter()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Accountability bar
    const bar = document.getElementById('acc-bar-demo')
    if (bar) {
      for (let i = 0; i < 30; i++) {
        const d = document.createElement('div')
        d.className = 'acc-day' + (i < 22 ? ' success' : '')
        bar.appendChild(d)
      }
    }

    // Streak grid
    const lpGrid = document.getElementById('streak-grid-lp')
    if (lpGrid) {
      for (let i = 0; i < 91; i++) {
        const d = document.createElement('div')
        const r = Math.random()
        const opacity = r < 0.15 ? '0.05' : r < 0.35 ? '0.1' : r < 0.6 ? '0.2' : r < 0.8 ? '0.35' : '0.55'
        d.style.cssText = `height:14px; border-radius:2px; background:rgba(255,255,255,${opacity});`
        lpGrid.appendChild(d)
      }
    }

    // Mobile menu
    const menuOpen  = document.getElementById('menuOpen')
    const menuClose = document.getElementById('menuClose')
    const mobileMenu = document.getElementById('mobileMenu')
    menuOpen?.addEventListener('click',  () => mobileMenu?.classList.remove('translate-x-full'))
    menuClose?.addEventListener('click', () => mobileMenu?.classList.add('translate-x-full'))

    // Expose globals
    ;(window as any).switchTab = (tab: string, el: HTMLElement) => {
      document.querySelectorAll('.sidebar-item').forEach(i => {
        i.classList.remove('active')
        i.querySelector('.si-line')?.classList.remove('active')
      })
      el.classList.add('active')
      el.querySelector('.si-line')?.classList.add('active')
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
      document.getElementById('panel-' + tab)?.classList.add('active')
    }

    ;(window as any).toggleTask = (el: HTMLElement) => {
      el.classList.toggle('done')
      el.textContent = el.classList.contains('done') ? '✓' : ''
      const tn = el.nextElementSibling as HTMLElement
      if (tn) tn.classList.toggle('done')
    }

    ;(window as any).toggleHabit = (el: HTMLElement) => {
      el.classList.toggle('done')
      el.textContent = el.classList.contains('done') ? '✓' : ''
    }

    ;(window as any).addTask = () => {
      const input = document.getElementById('new-task-input') as HTMLInputElement
      const val = input?.value.trim()
      if (!val) return
      const list = document.getElementById('task-list-demo')
      const div = document.createElement('div')
      div.className = 'task-item'
      div.innerHTML = `<div class="task-check" onclick="window.toggleTask(this)"></div><div class="task-name">${val}</div><div class="task-tag">Task</div>`
      list?.appendChild(div)
      input.value = ''
    }

    ;(window as any).toggleFaq = (el: HTMLElement) => {
      const answer = el.nextElementSibling as HTMLElement
      const icon   = el.querySelector('.faq-icon') as HTMLElement
      const text   = el.querySelector('.faq-q-text') as HTMLElement
      const isOpen = answer?.classList.contains('open')
      document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'))
      document.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('open'))
      document.querySelectorAll('.faq-q-text').forEach(t => t.classList.remove('open'))
      if (!isOpen) { answer?.classList.add('open'); icon?.classList.add('open'); text?.classList.add('open') }
    }

    // HIW chat
    const hiwHistory: {role:string;content:string}[] = []

    function hiwAddMsg(type: string, name: string, text: string) {
      const msgs = document.getElementById('hiw-msgs')
      const d = document.createElement('div')
      d.className = `hiw-cmsg ${type}`
      d.innerHTML = `<div class="hiw-cname">${name}</div><div class="hiw-cbubble ${type}">${text}</div>`
      msgs?.appendChild(d)
      if (msgs) msgs.scrollTop = msgs.scrollHeight
      return d
    }

    function hiwAddTyping() {
      const msgs = document.getElementById('hiw-msgs')
      const d = document.createElement('div')
      d.className = 'hiw-cmsg ai'
      d.innerHTML = `<div class="hiw-cname">Taskflow AI</div><div class="hiw-cbubble ai" style="display:flex;gap:4px;align-items:center;"><span class="hiw-tdot"></span><span class="hiw-tdot"></span><span class="hiw-tdot"></span></div>`
      msgs?.appendChild(d)
      if (msgs) msgs.scrollTop = msgs.scrollHeight
      return d
    }

    ;(window as any).hiwSendMsg = async () => {
      const input = document.getElementById('hiw-cinput') as HTMLInputElement
      const btn   = document.getElementById('hiw-csend') as HTMLButtonElement
      const msg   = input?.value.trim()
      if (!msg) return
      input.value = ''; btn.disabled = true
      hiwAddMsg('user', 'You', msg)
      hiwHistory.push({ role: 'user', content: msg })
      const typing = hiwAddTyping()
      try {
        const res = await fetch(`${API}/ai/chat`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: hiwHistory,
            system: `You are Taskflow AI — a personal coach and accountability partner. You know the user: 14-day streak, 5/7 tasks done, 22-day NoFap streak, habits include morning workout and journaling. Speak like a real supportive friend. Keep responses SHORT (2-3 sentences max). Be direct and warm.`,
          })
        })
        const data = await res.json()
        const reply = data.reply || "I'm here — what do you need?"
        typing.remove()
        hiwHistory.push({ role: 'assistant', content: reply })
        hiwAddMsg('ai', 'Taskflow AI', reply)
      } catch {
        typing.remove()
        hiwAddMsg('ai', 'Taskflow AI', "I'm here for you. What's on your mind?")
      }
      btn.disabled = false
    }

    ;(window as any).hiwSendSug = (btn: HTMLElement) => {
      const input = document.getElementById('hiw-cinput') as HTMLInputElement
      if (input) input.value = btn.textContent || ''
      ;(window as any).hiwSendMsg()
    }
  }, [])

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0A0A0A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #fff; min-height: 100vh; overflow-x: hidden; }
        :root { --header-height: 72px; }
        .logo { display:flex; align-items:center; gap:9px; font-weight:700; font-size:17px; letter-spacing:-0.3px; }
        .logo-icon { width:30px; height:30px; background:#fff; border-radius:7px; display:flex; align-items:center; justify-content:center; }
        .hero { display:flex; flex-direction:column; align-items:center; padding:calc(var(--header-height) + 48px) 40px 0; gap:0; }
        .hero-left { display:flex; flex-direction:column; align-items:center; text-align:center; max-width:680px; width:100%; margin-bottom:52px; }
        .hero-right { width:100%; max-width:960px; padding:0; }
        .hero h1 { font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif; font-size:clamp(28px,4vw,58px); font-weight:800; line-height:1.1; letter-spacing:-1.5px; margin-bottom:22px; color:#fff; }
        .hero h1 .dim { color:rgba(255,255,255,0.35); }
        .hero-sub { max-width:480px; margin:0 auto 40px; font-size:15px; color:rgba(255,255,255,0.45); line-height:1.7; }
        .hero-ctas { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .cta-main { background:#fff; color:#0A0A0A; font-size:14px; font-weight:600; border:none; cursor:pointer; padding:12px 24px; border-radius:9px; transition:all 0.2s; font-family:inherit; }
        .cta-main:hover { background:rgba(255,255,255,0.88); transform:translateY(-1px); }
        .cta-secondary { background:transparent; color:rgba(255,255,255,0.45); font-size:14px; font-weight:500; border:1px solid rgba(255,255,255,0.1); cursor:pointer; padding:12px 20px; border-radius:9px; transition:all 0.2s; font-family:inherit; }
        .cta-secondary:hover { border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); }
        .hero-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:100px; padding:6px 14px; font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:28px; width:fit-content; }
        .badge-dot { width:5px; height:5px; background:rgba(255,255,255,0.6); border-radius:50%; }
        .dashboard-preview { width:100%; max-width:960px; background:#111111; border:1px solid rgba(255,255,255,0.07); border-radius:14px; overflow:hidden; position:relative; margin:0 auto; }
        .preview-bar { display:flex; align-items:center; gap:6px; padding:11px 16px; border-bottom:1px solid rgba(255,255,255,0.05); background:#0F0F0F; }
        .dot { width:9px; height:9px; border-radius:50%; } .dot-r { background:#3a3a3a; } .dot-y { background:#3a3a3a; } .dot-g { background:#3a3a3a; }
        .preview-url { margin:0 auto; font-size:11px; color:rgba(255,255,255,0.18); background:rgba(255,255,255,0.04); padding:3px 14px; border-radius:5px; }
        .preview-body { display:grid; grid-template-columns:200px 1fr; min-height:620px; }
        .sidebar { border-right:1px solid rgba(255,255,255,0.05); padding:18px 0; background:rgba(0,0,0,0.3); }
        .sidebar-logo { display:flex; align-items:center; gap:7px; padding:0 14px 16px; font-size:13px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:10px; color:rgba(255,255,255,0.8); }
        .s-icon { width:20px; height:20px; background:rgba(255,255,255,0.9); border-radius:5px; }
        .sidebar-item { display:flex; align-items:center; gap:9px; padding:7px 14px; font-size:12px; color:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.15s; }
        .sidebar-item.active { color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.05); }
        .sidebar-item:hover:not(.active) { color:rgba(255,255,255,0.55); }
        .si-line { width:2px; height:12px; border-radius:2px; background:rgba(255,255,255,0.12); }
        .si-line.active { background:rgba(255,255,255,0.7); }
        .main-content { padding:20px 22px; }
        .greeting { font-size:16px; font-weight:600; margin-bottom:2px; letter-spacing:-0.3px; color:rgba(255,255,255,0.9); }
        .greeting-sub { font-size:11px; color:rgba(255,255,255,0.25); margin-bottom:18px; }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
        .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px 12px; }
        .stat-label { font-size:10px; color:rgba(255,255,255,0.25); margin-bottom:3px; text-transform:uppercase; letter-spacing:0.3px; }
        .stat-value { font-size:18px; font-weight:600; letter-spacing:-0.5px; color:rgba(255,255,255,0.85); }
        .ai-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; align-items:flex-start; gap:9px; }
        .ai-pip { width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.08); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:10px; color:rgba(255,255,255,0.5); margin-top:1px; }
        .ai-text { font-size:11.5px; color:rgba(255,255,255,0.45); line-height:1.55; }
        .ai-text strong { color:rgba(255,255,255,0.75); font-weight:500; }
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .section-title { font-size:10px; font-weight:500; color:rgba(255,255,255,0.25); letter-spacing:0.6px; text-transform:uppercase; }
        .task-item { display:flex; align-items:center; gap:9px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px; }
        .task-check { width:14px; height:14px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.6); cursor:pointer; }
        .task-check.done { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.12); }
        .task-name { color:rgba(255,255,255,0.6); flex:1; }
        .task-name.done { text-decoration:line-through; color:rgba(255,255,255,0.2); }
        .task-tag { font-size:9px; padding:2px 7px; border-radius:4px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.3); }
        .preview-fade { position:absolute; bottom:0; left:0; right:0; height:120px; background:linear-gradient(transparent,rgba(10,10,10,0.97)); pointer-events:none; }
        .features-strip { display:flex; align-items:center; justify-content:center; gap:36px; padding:28px 40px; border-top:1px solid rgba(255,255,255,0.04); flex-wrap:wrap; }
        .feature-pill { display:flex; align-items:center; gap:6px; font-size:12px; color:rgba(255,255,255,0.3); }
        .pill-check { width:14px; height:14px; border-radius:4px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.4); }
        .panel { display:none; animation:fadeIn 0.2s ease; }
        .panel.active { display:block; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .task-input-new { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:7px; padding:8px 12px; font-size:11px; color:#fff; font-family:inherit; margin-bottom:8px; outline:none; }
        .task-input-new::placeholder { color:rgba(255,255,255,0.2); }
        .add-task-btn { background:#fff; color:#0A0A0A; border:none; border-radius:6px; padding:6px 12px; font-size:10px; font-weight:600; cursor:pointer; font-family:inherit; margin-bottom:12px; }
        .habit-item { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .habit-name { font-size:11px; color:rgba(255,255,255,0.7); flex:1; }
        .habit-streak { font-size:10px; color:rgba(255,255,255,0.3); }
        .habit-btn { width:22px; height:22px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.3); font-size:9px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .habit-btn.done { background:rgba(255,255,255,0.12); border-color:transparent; color:rgba(255,255,255,0.7); }
        .journal-prompt { font-size:11px; color:rgba(255,255,255,0.35); font-style:italic; margin-bottom:10px; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:6px; border-left:2px solid rgba(255,255,255,0.1); }
        .journal-area { width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:7px; padding:10px 12px; font-size:11px; color:rgba(255,255,255,0.7); font-family:inherit; resize:none; outline:none; line-height:1.6; min-height:100px; }
        .save-btn { margin-top:8px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px 14px; font-size:10px; cursor:pointer; font-family:inherit; }
        .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .cal-month { font-size:13px; font-weight:600; color:rgba(255,255,255,0.8); }
        .cal-nav { background:none; border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); border-radius:5px; padding:3px 8px; font-size:11px; cursor:pointer; }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
        .cal-day-name { font-size:9px; color:rgba(255,255,255,0.2); text-align:center; padding:3px 0; text-transform:uppercase; }
        .cal-day { font-size:10px; color:rgba(255,255,255,0.4); text-align:center; padding:5px 3px; border-radius:5px; cursor:pointer; transition:all 0.15s; }
        .cal-day:hover { background:rgba(255,255,255,0.06); }
        .cal-day.today { background:#fff; color:#0A0A0A; font-weight:700; }
        .cal-day.has-task { color:rgba(255,255,255,0.7); }
        .acc-streak { text-align:center; padding:16px 0 12px; }
        .acc-num { font-size:44px; font-weight:800; color:rgba(255,255,255,0.9); letter-spacing:-2px; line-height:1; }
        .acc-label { font-size:11px; color:rgba(255,255,255,0.3); margin-top:4px; }
        .acc-btns { display:flex; gap:8px; margin-bottom:12px; }
        .acc-checkin { flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); border-radius:7px; padding:7px; font-size:11px; cursor:pointer; font-family:inherit; }
        .acc-reset { background:rgba(255,60,60,0.08); border:1px solid rgba(255,60,60,0.15); color:rgba(255,100,100,0.6); border-radius:7px; padding:7px 12px; font-size:11px; cursor:pointer; font-family:inherit; }
        .acc-bar { display:flex; gap:3px; margin-bottom:10px; flex-wrap:wrap; }
        .acc-day { width:12px; height:12px; border-radius:3px; background:rgba(255,255,255,0.06); }
        .acc-day.success { background:rgba(255,255,255,0.25); }
        .acc-reflection { font-size:10.5px; color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; line-height:1.5; font-style:italic; }
        .faq-item { border-bottom:1px solid rgba(255,255,255,0.07); }
        .faq-item:first-child { border-top:1px solid rgba(255,255,255,0.07); }
        .faq-q { display:flex; align-items:center; justify-content:space-between; padding:20px 0; cursor:pointer; gap:16px; }
        .faq-q-text { font-size:15px; font-weight:600; color:rgba(255,255,255,0.7); letter-spacing:-0.2px; transition:color 0.15s; }
        .faq-q-text.open { color:rgba(255,255,255,0.92); }
        .faq-q:hover .faq-q-text { color:rgba(255,255,255,0.9); }
        .faq-icon { width:22px; height:22px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; color:rgba(255,255,255,0.4); transition:all 0.2s; }
        .faq-icon.open { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.7); transform:rotate(45deg); }
        .faq-a { max-height:0; overflow:hidden; transition:max-height 0.3s ease; }
        .faq-a.open { max-height:300px; }
        .faq-a-inner { padding-bottom:18px; font-size:13.5px; color:rgba(255,255,255,0.45); line-height:1.75; }
        .hiw-step { display:grid; grid-template-columns:80px 1fr 1fr; gap:48px; align-items:center; padding:56px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .hiw-step:last-child { border-bottom:none; }
        .hiw-step.flip { grid-template-columns:1fr 1fr 80px; }
        .hiw-step.flip .hiw-num { order:3; }
        .hiw-step.flip .hiw-text { order:2; text-align:right; }
        .hiw-step.flip .hiw-text .hiw-desc { margin-left:auto; }
        .hiw-step.flip .hiw-card { order:1; }
        .hiw-num { display:flex; flex-direction:column; align-items:center; height:100%; }
        .hiw-circle { width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:rgba(255,255,255,0.3); flex-shrink:0; }
        .hiw-vline { width:1px; flex:1; background:rgba(255,255,255,0.06); margin-top:10px; min-height:40px; }
        .hiw-step:last-child .hiw-vline { display:none; }
        .hiw-text { display:flex; flex-direction:column; justify-content:center; }
        .hiw-tag { font-size:10px; font-weight:500; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
        .hiw-title { font-size:clamp(22px,2.5vw,34px); font-weight:800; letter-spacing:-1px; line-height:1.1; margin-bottom:14px; color:rgba(255,255,255,0.9); }
        .hiw-desc { font-size:14px; color:rgba(255,255,255,0.38); line-height:1.75; max-width:380px; }
        .hiw-card { background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden; }
        .hiw-bar { display:flex; align-items:center; gap:5px; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.05); background:#0F0F0F; }
        .hiw-dot { width:8px; height:8px; border-radius:50%; background:#2a2a2a; }
        .hiw-body { padding:18px; }
        .hiw-fi-lbl { font-size:9px; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:5px; }
        .hiw-fi { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:7px; padding:8px 12px; font-size:12px; color:rgba(255,255,255,0.6); width:100%; margin-bottom:10px; }
        .hiw-fbtn { background:#fff; color:#0A0A0A; border:none; border-radius:7px; padding:9px; font-size:12px; font-weight:600; width:100%; cursor:pointer; font-family:inherit; }
        .hiw-fnote { font-size:9px; color:rgba(255,255,255,0.2); text-align:center; margin-top:8px; }
        .hiw-arow { display:flex; align-items:center; gap:9px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .hiw-arow:last-child { border-bottom:none; }
        .hiw-aicon { width:22px; height:22px; border-radius:6px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }
        .hiw-aname { font-size:12px; color:rgba(255,255,255,0.6); flex:1; }
        .hiw-achk { width:15px; height:15px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.5); }
        .hiw-ins { display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px; margin-bottom:7px; }
        .hiw-ins:last-child { margin-bottom:0; }
        .hiw-ipip { width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.4); flex-shrink:0; margin-top:1px; }
        .hiw-itxt { font-size:11px; color:rgba(255,255,255,0.45); line-height:1.55; }
        .hiw-itxt b { color:rgba(255,255,255,0.75); font-weight:500; }
        .hiw-pblock { display:flex; align-items:center; gap:9px; padding:7px 9px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px; margin-bottom:6px; }
        .hiw-ptime { font-size:10px; color:rgba(255,255,255,0.28); min-width:40px; }
        .hiw-pname { font-size:11px; color:rgba(255,255,255,0.65); flex:1; }
        .hiw-ptag { font-size:8px; padding:2px 6px; border-radius:3px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.28); }
        .hiw-chat-msgs { display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; margin-bottom:10px; scrollbar-width:none; }
        .hiw-chat-msgs::-webkit-scrollbar { display:none; }
        .hiw-cmsg { display:flex; flex-direction:column; }
        .hiw-cmsg.user { align-items:flex-end; }
        .hiw-cmsg.ai { align-items:flex-start; }
        .hiw-cname { font-size:9px; color:rgba(255,255,255,0.22); margin-bottom:2px; }
        .hiw-cbubble { padding:7px 10px; border-radius:10px; font-size:11px; line-height:1.5; max-width:90%; }
        .hiw-cbubble.user { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.75); border-radius:10px 10px 2px 10px; }
        .hiw-cbubble.ai { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.6); border-radius:10px 10px 10px 2px; }
        .hiw-chat-sugs { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
        .hiw-csug { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:100px; padding:4px 10px; font-size:9px; color:rgba(255,255,255,0.4); cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .hiw-csug:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.7); }
        .hiw-chat-wrap { display:flex; gap:6px; }
        .hiw-cinput { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:7px; padding:7px 10px; font-size:11px; color:#fff; font-family:inherit; outline:none; }
        .hiw-cinput:focus { border-color:rgba(255,255,255,0.18); }
        .hiw-cinput::placeholder { color:rgba(255,255,255,0.2); }
        .hiw-csend { background:#fff; color:#0A0A0A; border:none; border-radius:7px; padding:7px 12px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }
        .hiw-csend:disabled { background:rgba(255,255,255,0.2); cursor:not-allowed; }
        @keyframes hiw-tdot { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-3px);opacity:0.8} }
        .hiw-tdot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.3); animation:hiw-tdot 1.2s infinite; display:inline-block; }
        .hiw-tdot:nth-child(2) { animation-delay:0.2s; }
        .hiw-tdot:nth-child(3) { animation-delay:0.4s; }
        .stats-bar { max-width:860px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden; }
        .section-h2-lg { font-size:38px; font-weight:800; line-height:1.08; letter-spacing:-1.5px; }
        .bento-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
        .bento-span2 { grid-column:span 2; }
        @media(max-width:768px) {
          .hero { padding:calc(var(--header-height) + 24px) 20px 48px; }
          .hero h1 { font-size:clamp(28px,7vw,40px); letter-spacing:-1px; }
          .preview-body { grid-template-columns:1fr; }
          .sidebar { display:none; }
          .hiw-step,.hiw-step.flip { grid-template-columns:1fr!important; gap:20px; padding:36px 0; }
          .hiw-step.flip .hiw-num { order:1!important; }
          .hiw-step.flip .hiw-text { order:2!important; text-align:left!important; }
          .hiw-step.flip .hiw-card { order:3!important; }
          .hiw-num { flex-direction:row; gap:12px; height:auto; align-items:center; }
          .hiw-vline { display:none; }
          .bento-grid { grid-template-columns:1fr!important; }
          .bento-span2 { grid-column:span 1!important; }
          .stats-bar { grid-template-columns:1fr 1fr!important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ position:'fixed', top:0, left:0, width:'100%', height:'72px', zIndex:50, background:'rgba(10,10,10,0.7)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth:'none', margin:'0 auto', height:'100%', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', padding:'0 40px', gap:'20px' }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:'8px', color:'#fff', fontWeight:'bold', fontSize:'16px', textDecoration:'none' }}>
            <div style={{ width:'28px', height:'28px', background:'#fff', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            TaskFlow
          </a>
          <nav style={{ display:'flex', alignItems:'center', gap:'32px' }}>
            {['Features','Pricing','Blog','Contact'].map(item => (
              <a key={item} href={`/${item.toLowerCase()}`} style={{ color:'rgba(255,255,255,0.6)', textDecoration:'none', fontSize:'14px' }}>{item}</a>
            ))}
          </nav>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'12px' }}>
            <a href="/auth/login" style={{ color:'rgba(255,255,255,0.6)', fontSize:'14px', textDecoration:'none', padding:'8px 14px' }}>Log in</a>
            <a href="/auth/register" style={{ background:'#fff', color:'#0A0A0A', fontSize:'13px', fontWeight:600, padding:'9px 18px', borderRadius:'8px', textDecoration:'none' }}>Sign up</a>
            <button id="menuOpen" style={{ display:'none', background:'none', border:'none', color:'#fff', fontSize:'24px', cursor:'pointer' }}>☰</button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div id="mobileMenu" style={{ position:'fixed', inset:0, zIndex:60, background:'#0A0A0A', color:'#fff', transform:'translateX(100%)', transition:'transform 0.3s ease-out' }}>
        <div style={{ height:'72px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontWeight:'bold' }}>TaskFlow</span>
          <button id="menuClose" style={{ background:'none', border:'none', color:'#fff', fontSize:'24px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'32px 24px', display:'flex', flexDirection:'column', gap:'24px' }}>
          {['Features','Pricing','Blog','Contact'].map(item => (
            <a key={item} href={`/${item.toLowerCase()}`} style={{ color:'rgba(255,255,255,0.8)', textDecoration:'none', fontSize:'16px' }}>{item}</a>
          ))}
          <div style={{ marginTop:'32px', display:'flex', flexDirection:'column', gap:'12px' }}>
            <a href="/auth/register" style={{ textAlign:'center', background:'#fff', color:'#0A0A0A', padding:'14px', borderRadius:'8px', fontWeight:600, textDecoration:'none' }}>Sign up</a>
            <a href="/auth/login" style={{ textAlign:'center', border:'1px solid rgba(255,255,255,0.2)', padding:'14px', borderRadius:'8px', textDecoration:'none', color:'#fff' }}>Log in</a>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge"><div className="badge-dot"/>AI-powered · Free forever</div>
          <h1>Stop juggling apps.<br/><span className="dim">Start becoming who</span><br/>you&apos;re supposed to be.</h1>
          <p className="hero-sub">Not another productivity app. An AI that studies your behavior, connects every part of your life, and gets smarter every day.</p>
          <div className="hero-ctas">
            <button className="cta-main" onClick={() => router.push('/auth/register')}>Start for free →</button>
            <button className="cta-secondary">See how it works</button>
          </div>
        </div>
        <div className="hero-right">
          <div className="dashboard-preview">
            <div className="preview-bar">
              <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
              <div className="preview-url">tflow.live/home</div>
            </div>
            <div className="preview-body">
              <div className="sidebar">
                <div className="sidebar-logo"><div className="s-icon"/>TaskFlow</div>
                {[['home','⌂','Home'],['tasks','✓','Tasks'],['habits','↺','Habits'],['journal','✎','Journal'],['calendar','▦','Calendar'],['accountability','⊗','Accountability']].map(([tab, icon, label]) => (
                  <div key={tab} className={`sidebar-item${tab==='home'?' active':''}`} onClick={(e) => (window as any).switchTab(tab, e.currentTarget)}>
                    <div className={`si-line${tab==='home'?' active':''}`}/>{label}
                  </div>
                ))}
              </div>
              <div className="main-content">
                {/* HOME */}
                <div className="panel active" id="panel-home">
                  <div className="greeting">Good morning, Donny 👋</div>
                  <div className="greeting-sub">Saturday, March 28 · 7 tasks · 3 habits due</div>
                  <div className="stats-row">
                    <div className="stat-card"><div className="stat-label">Streak</div><div className="stat-value">14 days</div></div>
                    <div className="stat-card"><div className="stat-label">Tasks</div><div className="stat-value">5 / 7</div></div>
                    <div className="stat-card"><div className="stat-label">NoFap</div><div className="stat-value">22 days</div></div>
                  </div>
                  <div className="ai-card"><div className="ai-pip">✦</div><div className="ai-text"><strong>AI insight —</strong> You finish 40% more tasks on days you work out first. Your workout is at 8am today. Don&apos;t skip it.</div></div>
                  <div className="section-header"><div className="section-title">Today&apos;s priorities</div><div className="section-add">+ Add</div></div>
                  <div className="task-item"><div className="task-check done" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}>✓</div><div className="task-name done">Morning workout</div><div className="task-tag">Habit</div></div>
                  <div className="task-item"><div className="task-check done" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}>✓</div><div className="task-name done">Journal entry</div><div className="task-tag">Habit</div></div>
                  <div className="task-item"><div className="task-check" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}/><div className="task-name">Deploy Taskflow</div><div className="task-tag">Task</div></div>
                  <div className="task-item"><div className="task-check" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}/><div className="task-name">Rebuild landing page</div><div className="task-tag">Task</div></div>
                </div>
                {/* TASKS */}
                <div className="panel" id="panel-tasks">
                  <div className="greeting">Tasks</div>
                  <div className="greeting-sub">Manage your to-dos and goals</div>
                  <input className="task-input-new" id="new-task-input" placeholder="Add a new task..." onKeyDown={(e)=>e.key==='Enter'&&(window as any).addTask()}/>
                  <button className="add-task-btn" onClick={()=>(window as any).addTask()}>+ Add Task</button>
                  <div id="task-list-demo">
                    <div className="task-item"><div className="task-check done" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}>✓</div><div className="task-name done">Morning workout</div><div className="task-tag">Habit</div></div>
                    <div className="task-item"><div className="task-check" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}/><div className="task-name">Deploy Taskflow</div><div className="task-tag">Task</div></div>
                    <div className="task-item"><div className="task-check" onClick={(e)=>(window as any).toggleTask(e.currentTarget)}/><div className="task-name">Record music session</div><div className="task-tag">Task</div></div>
                  </div>
                </div>
                {/* HABITS */}
                <div className="panel" id="panel-habits">
                  <div className="greeting">Habits</div>
                  <div className="greeting-sub">Build consistency one day at a time</div>
                  <div className="section-header"><div className="section-title">Today&apos;s habits</div></div>
                  {[['Morning workout','🔥 14 days',true],['Journal entry','🔥 7 days',true],['Read 20 pages','3 days',false],['No junk food','5 days',false],['Cold shower','2 days',false]].map(([name, streak, done]) => (
                    <div key={String(name)} className="habit-item">
                      <button className={`habit-btn${done?' done':''}`} onClick={(e)=>(window as any).toggleHabit(e.currentTarget)}>{done?'✓':''}</button>
                      <div className="habit-name">{String(name)}</div>
                      <div className="habit-streak">{String(streak)}</div>
                    </div>
                  ))}
                </div>
                {/* JOURNAL */}
                <div className="panel" id="panel-journal">
                  <div className="greeting">Journal</div>
                  <div className="greeting-sub">Saturday, March 28, 2026</div>
                  <div className="journal-prompt">✦ AI prompt: &quot;You completed 5 tasks today. What drove that momentum — and how do you keep it tomorrow?&quot;</div>
                  <textarea className="journal-area" placeholder="Write your thoughts here..."/>
                  <button className="save-btn">Save entry</button>
                </div>
                {/* CALENDAR */}
                <div className="panel" id="panel-calendar">
                  <div className="greeting">Calendar</div>
                  <div className="cal-header">
                    <div className="cal-month">March 2026</div>
                    <div style={{display:'flex',gap:'4px'}}><button className="cal-nav">‹</button><button className="cal-nav">›</button></div>
                  </div>
                  <div className="cal-grid">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} className="cal-day-name">{d}</div>)}
                    {[...Array(6)].map((_,i)=><div key={`e${i}`} className="cal-day"/>)}
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(d=>(
                      <div key={d} className={`cal-day${d===28?' today':d%3===0?' has-task':''}`}>{d}</div>
                    ))}
                  </div>
                </div>
                {/* ACCOUNTABILITY */}
                <div className="panel" id="panel-accountability">
                  <div className="greeting">Accountability</div>
                  <div className="greeting-sub">NoFap / NoPorn tracker</div>
                  <div className="acc-streak">
                    <div className="acc-num" id="acc-days">22</div>
                    <div className="acc-label">days clean</div>
                  </div>
                  <div className="acc-btns">
                    <button className="acc-checkin" onClick={()=>{const el=document.getElementById('acc-days');if(el)el.textContent=String(parseInt(el.textContent||'0')+1)}}>✓ Check in today</button>
                    <button className="acc-reset" onClick={()=>{const el=document.getElementById('acc-days');if(el)el.textContent='0'}}>Reset</button>
                  </div>
                  <div className="section-title" style={{marginBottom:'6px'}}>Last 30 days</div>
                  <div className="acc-bar" id="acc-bar-demo"/>
                  <div className="acc-reflection">✦ &quot;You&apos;ve made it 22 days. The urge is temporary — your streak is permanent. What are you doing instead right now?&quot;</div>
                </div>
              </div>
            </div>
            <div className="preview-fade" />
          </div>
        </div>
      </section>

      <div className="features-strip">
        <div className="feature-pill"><div className="pill-check">✓</div> Tasks &amp; Goals</div>
        <div className="feature-pill"><div className="pill-check">✓</div> Habit Tracking</div>
        <div className="feature-pill"><div className="pill-check">✓</div> Accountability</div>
        <div className="feature-pill"><div className="pill-check">✓</div> Journal &amp; Notes</div>
        <div className="feature-pill"><div className="pill-check">✓</div> AI Life Coach</div>
      </div>

      <div dangerouslySetInnerHTML={{ __html: landingSectionsHtml }} />
    </>
  )
}

const landingSectionsHtml = `
<section class="w-full px-6 md:px-[56px] py-16 md:py-[112px] bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div>
      <div class="hiw-step">
        <div class="hiw-num"><div class="hiw-circle">01</div><div class="hiw-vline"></div></div>
        <div class="hiw-text">
          <div class="hiw-tag">60 seconds</div>
          <div class="hiw-title">Sign up.<br>No setup required.</div>
          <p class="hiw-desc">Create your account in seconds. No credit card, no onboarding questionnaire, no overwhelm. Just log in and you're inside — ready to go.</p>
        </div>
        <div class="hiw-card">
          <div class="hiw-bar"><div class="hiw-dot"></div><div class="hiw-dot"></div><div class="hiw-dot"></div></div>
          <div class="hiw-body">
            <div class="hiw-fi-lbl">Name</div><div class="hiw-fi">Donny Fabuluje</div>
            <div class="hiw-fi-lbl">Email</div><div class="hiw-fi">donny@tflow.live</div>
            <button class="hiw-fbtn">Create my account →</button>
            <div class="hiw-fnote">Free forever. No credit card needed.</div>
          </div>
        </div>
      </div>

      <div class="hiw-step flip">
        <div class="hiw-num"><div class="hiw-circle">02</div><div class="hiw-vline"></div></div>
        <div class="hiw-text">
          <div class="hiw-tag">First 5 minutes</div>
          <div class="hiw-title">Add your tasks,<br>habits & goals.</div>
          <p class="hiw-desc">Drop in what you're working toward — tasks, habits you want to build, and accountability goals. Taskflow starts learning from day one.</p>
        </div>
        <div class="hiw-card">
          <div class="hiw-bar"><div class="hiw-dot"></div><div class="hiw-dot"></div><div class="hiw-dot"></div></div>
          <div class="hiw-body">
            <div class="hiw-arow"><div class="hiw-aicon">✅</div><div class="hiw-aname">Deploy Taskflow to production</div><div class="hiw-achk">✓</div></div>
            <div class="hiw-arow"><div class="hiw-aicon">🔁</div><div class="hiw-aname">Morning workout — daily</div><div class="hiw-achk">✓</div></div>
            <div class="hiw-arow"><div class="hiw-aicon">📓</div><div class="hiw-aname">Journal entry — daily</div><div class="hiw-achk">✓</div></div>
            <div class="hiw-arow"><div class="hiw-aicon">🚫</div><div class="hiw-aname">NoFap tracker</div><div class="hiw-achk">✓</div></div>
            <div class="hiw-arow"><div class="hiw-aicon" style="color:rgba(255,255,255,0.25);">+</div><div class="hiw-aname" style="color:rgba(255,255,255,0.25);">Add more...</div></div>
          </div>
        </div>
      </div>

      <div class="hiw-step">
        <div class="hiw-num"><div class="hiw-circle">03</div><div class="hiw-vline"></div></div>
        <div class="hiw-text">
          <div class="hiw-tag">Ongoing</div>
          <div class="hiw-title">The AI starts<br>learning you.</div>
          <p class="hiw-desc">Every task you check off, every habit you log, every journal entry — the AI absorbs it all and finds patterns you'd never notice yourself.</p>
        </div>
        <div class="hiw-card">
          <div class="hiw-bar"><div class="hiw-dot"></div><div class="hiw-dot"></div><div class="hiw-dot"></div></div>
          <div class="hiw-body">
            <div class="hiw-ins"><div class="hiw-ipip">↑</div><div class="hiw-itxt"><b>Pattern found:</b> You complete 40% more tasks on days you exercise first.</div></div>
            <div class="hiw-ins"><div class="hiw-ipip">↓</div><div class="hiw-itxt"><b>Slip detected:</b> You've skipped journaling 3 days — productivity is dropping.</div></div>
            <div class="hiw-ins"><div class="hiw-ipip">✦</div><div class="hiw-itxt"><b>Insight:</b> Your best days start before 9am with no phone for the first hour.</div></div>
            <div style="display:flex;align-items:center;gap:4px;padding:8px 0;">
              <span class="hiw-tdot"></span><span class="hiw-tdot"></span><span class="hiw-tdot"></span>
              <span style="font-size:9px;color:rgba(255,255,255,0.2);margin-left:4px;">AI analyzing your patterns...</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hiw-step flip">
        <div class="hiw-num"><div class="hiw-circle">04</div><div class="hiw-vline"></div></div>
        <div class="hiw-text">
          <div class="hiw-tag">Always available</div>
          <div class="hiw-title">Talk to your<br>AI coach anytime.</div>
          <p class="hiw-desc">Taskflow isn't just watching you — it's a coach, a friend, and an accountability partner you can actually talk to. Ask it anything. It knows you.</p>
        </div>
        <div class="hiw-card">
          <div class="hiw-bar"><div class="hiw-dot"></div><div class="hiw-dot"></div><div class="hiw-dot"></div><span style="margin-left:auto;font-size:9px;color:rgba(255,255,255,0.25);">✦ Taskflow AI</span></div>
          <div class="hiw-body">
            <div class="hiw-chat-sugs">
              <button class="hiw-csug" onclick="hiwSendSug(this)">Plan my day</button>
              <button class="hiw-csug" onclick="hiwSendSug(this)">I'm unmotivated</button>
              <button class="hiw-csug" onclick="hiwSendSug(this)">I relapsed</button>
            </div>
            <div class="hiw-chat-msgs" id="hiw-msgs">
              <div class="hiw-cmsg ai"><div class="hiw-cname">Taskflow AI</div><div class="hiw-cbubble ai">Hey Donny 👋 I know your streaks, habits, and goals. Ask me anything.</div></div>
            </div>
            <div class="hiw-chat-wrap">
              <input class="hiw-cinput" id="hiw-cinput" placeholder="Ask your AI coach..." onkeydown="if(event.key==='Enter')hiwSendMsg()">
              <button class="hiw-csend" id="hiw-csend" onclick="hiwSendMsg()">Send</button>
            </div>
          </div>
        </div>
      </div>

      <div class="hiw-step">
        <div class="hiw-num"><div class="hiw-circle">05</div><div class="hiw-vline"></div></div>
        <div class="hiw-text">
          <div class="hiw-tag">Every morning</div>
          <div class="hiw-title">Wake up to a plan<br>built just for you.</div>
          <p class="hiw-desc">Every morning Taskflow gives you a personalized daily plan — top priorities, time blocks, and habit reminders based on everything it knows about you.</p>
        </div>
        <div class="hiw-card">
          <div class="hiw-bar"><div class="hiw-dot"></div><div class="hiw-dot"></div><div class="hiw-dot"></div></div>
          <div class="hiw-body">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.7);">Your plan for today ✦</span>
              <span style="font-size:9px;color:rgba(255,255,255,0.25);">Sat, Mar 28</span>
            </div>
            <div class="hiw-pblock"><div class="hiw-ptime">7:00am</div><div class="hiw-pname">Morning workout</div><div class="hiw-ptag">Habit</div></div>
            <div class="hiw-pblock"><div class="hiw-ptime">8:30am</div><div class="hiw-pname">Deep work — Deploy Taskflow</div><div class="hiw-ptag">Task</div></div>
            <div class="hiw-pblock"><div class="hiw-ptime">12:00pm</div><div class="hiw-pname">Record music session</div><div class="hiw-ptag">Task</div></div>
            <div class="hiw-pblock"><div class="hiw-ptime">9:00pm</div><div class="hiw-pname">Journal + NoFap check-in</div><div class="hiw-ptag">Habit</div></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
              <span style="font-size:9px;color:rgba(255,255,255,0.25);">Yesterday's growth score</span>
              <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.7);">78 / 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="w-full px-6 md:px-[64px] py-16 md:py-[112px] bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div class="text-center mb-14">
      <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">Built different</p>
      <h2 class="section-h2-lg text-[38px] font-bold leading-[1.1] mb-4" style="letter-spacing:-1.5px;">
        Features you won't find<br>
        <span class="text-white/28">anywhere else — for free.</span>
      </h2>
      <p class="text-sm text-white/38 leading-relaxed max-w-[480px] mx-auto">
        Taskflow doesn't just track your life. It studies it, scores it, and actively helps you improve it.
      </p>
    </div>

    <div class="bento-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
      <div class="bento-span2" style="grid-column:span 2; background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden;">
        <div style="padding:22px 22px 16px;">
          <p style="font-size:10px; font-weight:500; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">Daily Growth Score</p>
          <h3 style="font-size:15px; font-weight:700; letter-spacing:-0.3px; margin-bottom:6px; color:rgba(255,255,255,0.88); line-height:1.3;">Your day, scored. Know exactly how you performed.</h3>
          <p style="font-size:11.5px; color:rgba(255,255,255,0.36); line-height:1.65;">Taskflow calculates a daily score based on tasks completed, habits hit, and consistency. See where you're winning and where to improve.</p>
        </div>
        <div style="background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); padding:16px;">
          <div style="display:flex; align-items:center; gap:20px;">
            <div style="position:relative; flex-shrink:0; width:80px; height:80px;">
              <svg width="80" height="80" viewBox="0 0 80 80" style="transform:rotate(-90deg);">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"></circle>
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="6" stroke-dasharray="201" stroke-dashoffset="50" stroke-linecap="round"></circle>
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <span style="font-size:22px; font-weight:800; letter-spacing:-1px; color:rgba(255,255,255,0.9); line-height:1;">78</span>
                <span style="font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.4px;">/ 100</span>
              </div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; color:rgba(255,255,255,0.45); flex:1;">Tasks</span>
                <div style="flex:2; height:4px; background:rgba(255,255,255,0.06); border-radius:2px;"><div style="width:71%; height:100%; background:rgba(255,255,255,0.35); border-radius:2px;"></div></div>
                <span style="font-size:10px; color:rgba(255,255,255,0.4); min-width:24px; text-align:right;">5/7</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; color:rgba(255,255,255,0.45); flex:1;">Habits</span>
                <div style="flex:2; height:4px; background:rgba(255,255,255,0.06); border-radius:2px;"><div style="width:66%; height:100%; background:rgba(255,255,255,0.35); border-radius:2px;"></div></div>
                <span style="font-size:10px; color:rgba(255,255,255,0.4); min-width:24px; text-align:right;">4/6</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; color:rgba(255,255,255,0.45); flex:1;">Journal</span>
                <div style="flex:2; height:4px; background:rgba(255,255,255,0.06); border-radius:2px;"><div style="width:100%; height:100%; background:rgba(255,255,255,0.35); border-radius:2px;"></div></div>
                <span style="font-size:10px; color:rgba(255,255,255,0.4); min-width:24px; text-align:right;">✓</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; color:rgba(255,255,255,0.45); flex:1;">Streak</span>
                <div style="flex:2; height:4px; background:rgba(255,255,255,0.06); border-radius:2px;"><div style="width:80%; height:100%; background:rgba(255,255,255,0.35); border-radius:2px;"></div></div>
                <span style="font-size:10px; color:rgba(255,255,255,0.4); min-width:24px; text-align:right;">14d</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden;">
        <div style="padding:22px 22px 16px;">
          <p style="font-size:10px; font-weight:500; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">Weekly AI Summary</p>
          <h3 style="font-size:15px; font-weight:700; letter-spacing:-0.3px; margin-bottom:6px; color:rgba(255,255,255,0.88); line-height:1.3;">What your week actually looked like — from the AI's view.</h3>
          <p style="font-size:11.5px; color:rgba(255,255,255,0.36); line-height:1.65;">Every Sunday, Taskflow's AI reviews your week and tells you exactly what to improve next.</p>
        </div>
        <div style="background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); padding:14px 16px; display:flex; flex-direction:column; gap:7px;">
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.4); flex-shrink:0; margin-top:1px;">↑</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">Best day: Wednesday.</strong> You completed all 7 tasks and hit every habit. What made it different?</p>
          </div>
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.4); flex-shrink:0; margin-top:1px;">↓</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">Slipped Thursday.</strong> Skipped journaling 3 days in a row — productivity dropped 30%.</p>
          </div>
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; color:rgba(255,255,255,0.4); flex-shrink:0; margin-top:1px;">✦</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">This week's focus:</strong> Sleep earlier. You work out more consistently when in bed before midnight.</p>
          </div>
        </div>
      </div>

      <div class="bento-span2" style="grid-column:span 2; background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden;">
        <div style="padding:22px 22px 16px;">
          <p style="font-size:10px; font-weight:500; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">Consistency Map</p>
          <h3 style="font-size:15px; font-weight:700; letter-spacing:-0.3px; margin-bottom:6px; color:rgba(255,255,255,0.88); line-height:1.3;">See your consistency over time — the full picture.</h3>
          <p style="font-size:11.5px; color:rgba(255,255,255,0.36); line-height:1.65;">Like GitHub's contribution graph but for your life. Every day you show up gets logged. Watch the pattern build over months.</p>
        </div>
        <div style="background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); padding:14px 16px;">
          <div id="streak-grid-lp" style="display:grid; grid-template-columns:repeat(13,1fr); gap:3px; margin-bottom:10px;"></div>
          <div style="display:flex; align-items:center; gap:4px; justify-content:flex-end;">
            <span style="font-size:9px; color:rgba(255,255,255,0.2);">Less</span>
            <div style="width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.05);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.1);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.2);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.35);"></div>
            <div style="width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.55);"></div>
            <span style="font-size:9px; color:rgba(255,255,255,0.2);">More</span>
          </div>
        </div>
      </div>

      <div style="background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:16px; overflow:hidden;">
        <div style="padding:22px 22px 16px;">
          <p style="font-size:10px; font-weight:500; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">AI Nudges</p>
          <h3 style="font-size:15px; font-weight:700; letter-spacing:-0.3px; margin-bottom:6px; color:rgba(255,255,255,0.88); line-height:1.3;">Proactive check-ins before slipping becomes a habit.</h3>
          <p style="font-size:11.5px; color:rgba(255,255,255,0.36); line-height:1.65;">Taskflow notices when you're off track and nudges you back — before it becomes a pattern.</p>
        </div>
        <div style="background:rgba(0,0,0,0.3); border-top:1px solid rgba(255,255,255,0.05); padding:14px 16px; display:flex; flex-direction:column; gap:7px;">
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; flex-shrink:0; margin-top:1px;">💬</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">3 days no journal.</strong> Want to do a quick 2-minute check-in?</p>
          </div>
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; flex-shrink:0; margin-top:1px;">💬</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">8am workout in 30 mins.</strong> Your most productive days start here.</p>
          </div>
          <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:7px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; font-size:8px; flex-shrink:0; margin-top:1px;">💬</div>
            <p style="font-size:10.5px; color:rgba(255,255,255,0.5); line-height:1.5;"><strong style="color:rgba(255,255,255,0.75); font-weight:500;">22-day streak at risk.</strong> You haven't checked in today. Don't break it now.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="w-full px-6 md:px-[64px] py-16 md:py-[112px] bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div class="text-center mb-14">
      <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">Real people. Real results.</p>
      <h2 class="section-h2-lg text-[38px] font-bold leading-[1.08] mb-4" style="letter-spacing:-1.5px;">
        People who stopped juggling<br>
        <span class="text-white/28">and started becoming.</span>
      </h2>
      <p class="text-sm text-white/38 leading-relaxed max-w-[420px] mx-auto">
        From broke college students to builders — people using Taskflow to actually change their lives.
      </p>
    </div>

    <div class="max-w-[860px] mx-auto mb-10 bg-[#111] border border-white/9 rounded-[20px] px-6 md:px-11 py-8 md:py-10 relative overflow-hidden">
      <div class="absolute top-[-20px] left-8 text-[160px] font-bold text-white/[0.03] leading-none pointer-events-none select-none">"</div>
      <p class="text-[22px] font-bold leading-[1.45] text-white/88 mb-7 max-w-[680px] relative z-10" style="letter-spacing:-0.5px;">
        "I've tried every productivity app out there. Taskflow is the <span class="text-white">first one that actually feels like it's on my side.</span> The AI knows when I'm slipping before I do."
      </p>
      <div class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-white/70 flex-shrink-0">JM</div>
        <div>
          <div class="text-sm font-semibold text-white/80">Jordan Mitchell</div>
          <div class="text-xs text-white/35">CS student, content creator</div>
        </div>
        <div class="flex gap-1 ml-auto text-white/60 text-sm">★★★★★</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[860px] mx-auto mb-10">
      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"The NoFap tracker alone is worth it. <strong class="text-white/82 font-medium">I couldn't find anything free like this anywhere.</strong> 47 days clean and counting."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">AT</div>
          <div><div class="text-xs font-semibold text-white/70">Alex T.</div><div class="text-[10px] text-white/30">College senior</div></div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"I was paying $54/month across 5 apps. <strong class="text-white/82 font-medium">Taskflow replaced all of them.</strong> And the AI actually gives me useful advice."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">KR</div>
          <div><div class="text-xs font-semibold text-white/70">Kai Rodriguez</div><div class="text-[10px] text-white/30">Entrepreneur, 22</div></div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"The daily growth score changed everything for me. <strong class="text-white/82 font-medium">I actually look forward to checking my score</strong> every night."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">DS</div>
          <div><div class="text-xs font-semibold text-white/70">Devon S.</div><div class="text-[10px] text-white/30">Music producer</div></div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"I journaled for the first time in my life because <strong class="text-white/82 font-medium">the AI prompt actually made me think.</strong> Now I do it every morning."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">MP</div>
          <div><div class="text-xs font-semibold text-white/70">Marcus P.</div><div class="text-[10px] text-white/30">High school senior</div></div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"The AI noticed I was more productive on days I worked out. <strong class="text-white/82 font-medium">I didn't even realize that pattern myself.</strong> Wild."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">TW</div>
          <div><div class="text-xs font-semibold text-white/70">Tyler W.</div><div class="text-[10px] text-white/30">Builder, founder</div></div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/7 rounded-2xl p-5 hover:border-white/14 transition-colors">
        <div class="text-white/50 text-xs mb-3">★★★★★</div>
        <p class="text-sm text-white/60 leading-relaxed mb-4">"Finally one app that <strong class="text-white/82 font-medium">doesn't treat self-improvement like a corporate productivity system.</strong> Built for real people."</p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">NB</div>
          <div><div class="text-xs font-semibold text-white/70">Naomi B.</div><div class="text-[10px] text-white/30">Student, designer</div></div>
        </div>
      </div>
    </div>

    <div class="stats-bar max-w-[860px] mx-auto grid grid-cols-2 md:grid-cols-4 bg-[#111] border border-white/7 rounded-2xl overflow-hidden">
      <div class="px-6 py-6 text-center border-r border-white/7">
        <div class="text-[28px] font-bold text-white/90 mb-1" style="letter-spacing:-1px;">2,000+</div>
        <div class="text-xs text-white/30">People signed up</div>
      </div>
      <div class="px-6 py-6 text-center border-r border-white/7">
        <div class="text-[28px] font-bold text-white/90 mb-1" style="letter-spacing:-1px;">4.9 ★</div>
        <div class="text-xs text-white/30">Average rating</div>
      </div>
      <div class="px-6 py-6 text-center border-r border-white/7">
        <div class="text-[28px] font-bold text-white/90 mb-1" style="letter-spacing:-1px;">$0</div>
        <div class="text-xs text-white/30">Cost to start</div>
      </div>
      <div class="px-6 py-6 text-center">
        <div class="text-[28px] font-bold text-white/90 mb-1" style="letter-spacing:-1px;">6-in-1</div>
        <div class="text-xs text-white/30">Apps replaced</div>
      </div>
    </div>
  </div>
</section>

<section class="w-full px-6 md:px-[64px] py-16 md:py-[112px] bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div class="flex items-end justify-between gap-10 mb-10 flex-wrap">
      <div>
        <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">The math is simple</p>
        <h2 class="section-h2-lg text-[38px] font-bold leading-[1.1] mb-3" style="letter-spacing:-1.5px;">
          Why pay $50/month<br>
          <span class="text-white/28">for 5 different apps?</span>
        </h2>
        <p class="text-sm text-white/38 leading-relaxed max-w-[380px]">
          Taskflow replaces everything — and adds AI that ties it all together. For free.
        </p>
      </div>
      <div class="text-right">
        <div class="text-[11px] text-white/35 mb-1">You save</div>
        <div class="text-[32px] font-bold text-white/85" style="letter-spacing:-1.5px;">$600+</div>
        <div class="text-[11px] text-white/30">every year</div>
      </div>
    </div>

    <div class="comp-table-scroll hidden md:block">
      <div class="comp-table-inner border border-white/8 rounded-2xl overflow-hidden">
        <div class="grid border-b border-white/7 bg-white/[0.03]" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Feature</div>
          <div class="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-red-400/60 text-center">Other apps</div>
          <div class="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/70 text-center flex items-center justify-center gap-2">
            Taskflow
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-2 py-[2px] rounded-full">FREE</span>
          </div>
        </div>

        <div class="grid border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3"><span class="text-sm">✅</span><span class="text-xs text-white/65">Task management</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs font-semibold text-red-400/70">$5/mo</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3"><span class="text-sm">🔁</span><span class="text-xs text-white/65">Habit tracking + streaks</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs font-semibold text-red-400/70">$8/mo</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3"><span class="text-sm">📓</span><span class="text-xs text-white/65">Journal &amp; notes</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs font-semibold text-red-400/70">$10/mo</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3"><span class="text-sm">📅</span><span class="text-xs text-white/65">Calendar planning</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs font-semibold text-red-400/70">$19/mo</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3"><span class="text-sm">🚫</span><span class="text-xs text-white/65">Accountability tracker (NoFap etc.)</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs font-semibold text-red-400/70">$12/mo</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid border-b border-white/[0.04] bg-white/[0.015]" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-3 flex items-center gap-3">
            <div class="w-[22px] h-[22px] rounded-md bg-white/7 flex items-center justify-center text-[9px] text-white/45 flex-shrink-0">✦</div>
            <span class="text-xs text-white/50"><strong class="text-white/70 font-medium">AI that studies your patterns</strong> and coaches you toward a better version of yourself</span>
          </div>
          <div class="px-5 py-3 flex items-center justify-center"><span class="text-xs text-white/18">—</span></div>
          <div class="px-5 py-3 flex items-center justify-center"><div class="w-[18px] h-[18px] rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div></div>
        </div>

        <div class="grid bg-white/[0.03] border-t border-white/8" style="grid-template-columns: 1fr 140px 140px;">
          <div class="px-5 py-4 flex items-center"><span class="text-xs font-semibold text-white/40">Total per month</span></div>
          <div class="px-5 py-4 flex items-center justify-center"><span class="text-base font-bold text-red-400/80">$54 / mo</span></div>
          <div class="px-5 py-4 flex items-center justify-center"><span class="text-base font-bold text-white/90">$0 / mo</span></div>
        </div>
      </div>
    </div>

    <div class="md:hidden flex flex-col gap-2">
      <div class="bg-[#111] border border-white/[0.07] rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base flex-shrink-0">✅</span>
          <span class="text-sm font-medium text-white/75">Task management</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs font-semibold text-red-400/70">$5/mo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/[0.07] rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base flex-shrink-0">🔁</span>
          <span class="text-sm font-medium text-white/75">Habit tracking + streaks</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs font-semibold text-red-400/70">$8/mo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/[0.07] rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base flex-shrink-0">📓</span>
          <span class="text-sm font-medium text-white/75">Journal &amp; notes</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs font-semibold text-red-400/70">$10/mo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/[0.07] rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base flex-shrink-0">📅</span>
          <span class="text-sm font-medium text-white/75">Calendar planning</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs font-semibold text-red-400/70">$19/mo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-[#111] border border-white/[0.07] rounded-xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base flex-shrink-0">🚫</span>
          <span class="text-sm font-medium text-white/75">Accountability tracker</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs font-semibold text-red-400/70">$12/mo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
        <div class="flex items-start gap-2 mb-3">
          <div class="w-5 h-5 rounded-md bg-white/7 flex items-center justify-center text-[9px] text-white/45 flex-shrink-0 mt-0.5">✦</div>
          <span class="text-sm text-white/60 leading-snug"><strong class="text-white/75 font-medium">AI that studies your patterns</strong> and coaches you toward a better version of yourself</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Others:</span>
            <span class="text-xs text-white/20">—</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-white/30">Taskflow:</span>
            <div class="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center text-[8px] text-white/60">✓</div>
            <span class="bg-white text-[#0A0A0A] text-[8px] font-bold px-1.5 py-[1px] rounded-full">FREE</span>
          </div>
        </div>
      </div>

      <div class="bg-white/[0.03] border border-white/8 rounded-xl p-4 mt-1">
        <div class="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Total per month</div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[10px] text-white/25 mb-1">Other apps</div>
            <div class="text-lg font-bold text-red-400/80">$54 / mo</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-white/25 mb-1">Taskflow</div>
            <div class="text-lg font-bold text-white/90">$0 / mo</div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-5 mt-8">
      <a href="/register" class="bg-white text-gray-900 px-6 py-3 rounded-md font-semibold hover:bg-white/90 transition text-sm">Start for free →</a>
      <span class="text-sm text-white/22">No credit card. No catch. Just one app.</span>
    </div>
  </div>
</section>

<section class="w-full bg-[#0A0A0A] text-white border-b border-white/5">
  <div class="max-w-[1280px] mx-auto px-6 md:px-[56px] py-16 md:py-[100px]">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
      <div class="flex flex-col">
        <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-4">Ready when you are</p>
        <h2 class="section-h2-lg text-[42px] font-bold leading-[1.08] mb-5" style="letter-spacing:-1.5px;">
          Stop planning.<br>
          <span class="text-white/28">Start becoming.</span>
        </h2>
        <p class="text-[15px] text-white/40 leading-[1.7] mb-9 max-w-[420px]">
          You've been juggling apps, missing habits, and losing streaks. Taskflow puts everything in one place — with an AI that actually knows you and guides you forward.
        </p>
        <div class="flex items-center gap-3 mb-8">
          <a href="/register" class="bg-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-[9px] hover:bg-white/90 transition">Start for free →</a>
          <a href="/features" class="text-white/45 text-sm border border-white/10 px-5 py-3 rounded-[9px] hover:border-white/20 hover:text-white/70 transition">See how it works</a>
        </div>
        <div class="flex items-center gap-3 text-xs text-white/25">
          <div class="flex">
            <div class="w-6 h-6 rounded-full border-[1.5px] border-[#0A0A0A] bg-white/10 flex items-center justify-center text-[8px] font-semibold text-white/60">JM</div>
            <div class="w-6 h-6 rounded-full border-[1.5px] border-[#0A0A0A] bg-white/10 flex items-center justify-center text-[8px] font-semibold text-white/60 -ml-1.5">AT</div>
            <div class="w-6 h-6 rounded-full border-[1.5px] border-[#0A0A0A] bg-white/10 flex items-center justify-center text-[8px] font-semibold text-white/60 -ml-1.5">KR</div>
            <div class="w-6 h-6 rounded-full border-[1.5px] border-[#0A0A0A] bg-white/10 flex items-center justify-center text-[8px] font-semibold text-white/60 -ml-1.5">DS</div>
          </div>
          <span>2,000+ people already building better lives</span>
        </div>
      </div>

      <div>
        <div class="bg-[#111] border border-white/8 rounded-2xl overflow-hidden">
          <div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-[#0F0F0F]">
            <div class="w-2 h-2 rounded-full bg-[#2a2a2a]"></div>
            <div class="w-2 h-2 rounded-full bg-[#2a2a2a]"></div>
            <div class="w-2 h-2 rounded-full bg-[#2a2a2a]"></div>
            <div class="mx-auto text-[10px] text-white/18 bg-white/4 px-3 py-0.5 rounded">tflow.live/home</div>
          </div>
          <div class="p-5">
            <div class="text-[15px] font-bold text-white/88 mb-0.5">Good morning, Donny 👋</div>
            <div class="text-[10px] text-white/25 mb-4">Your streak is on the line. Don't break it.</div>
            <div class="flex items-center justify-between bg-white/[0.03] border border-white/7 rounded-xl p-4 mb-3">
              <div>
                <div class="text-[11px] text-white/40 mb-1">Daily growth score</div>
                <div class="text-[28px] font-bold text-white/90" style="letter-spacing:-1px;">78</div>
              </div>
              <div class="text-right">
                <div class="text-[9px] text-white/25 mb-1">vs yesterday</div>
                <div class="text-[13px] font-semibold text-white/50">+12 pts</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-1.5 mb-3">
              <div class="bg-white/[0.03] border border-white/6 rounded-lg p-2.5"><div class="text-[9px] text-white/25 uppercase tracking-wide mb-0.5">Streak</div><div class="text-[15px] font-bold text-white/85">14d</div></div>
              <div class="bg-white/[0.03] border border-white/6 rounded-lg p-2.5"><div class="text-[9px] text-white/25 uppercase tracking-wide mb-0.5">Tasks</div><div class="text-[15px] font-bold text-white/85">5/7</div></div>
              <div class="bg-white/[0.03] border border-white/6 rounded-lg p-2.5"><div class="text-[9px] text-white/25 uppercase tracking-wide mb-0.5">NoFap</div><div class="text-[15px] font-bold text-white/85">22d</div></div>
            </div>
            <div class="bg-white/[0.03] border border-white/8 rounded-lg p-3 flex gap-2">
              <div class="w-[18px] h-[18px] rounded bg-white/8 flex items-center justify-center text-[9px] text-white/50 flex-shrink-0 mt-0.5">✦</div>
              <p class="text-[10.5px] text-white/40 leading-relaxed"><strong class="text-white/72 font-medium">AI insight —</strong> You're 40% more productive on workout days. Your 8am workout is next. Don't skip it.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="w-full bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto px-6 md:px-[56px] py-16 md:py-[100px]">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
      <div class="flex flex-col">
        <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-4">Stay in the loop</p>
        <h2 class="section-h2-lg text-[36px] font-bold leading-[1.1] mb-4" style="letter-spacing:-1.5px;">
          Be first to know<br>
          <span class="text-white/28">what's coming next.</span>
        </h2>
        <p class="text-sm text-white/40 leading-[1.7] mb-7 max-w-[380px]">
          Get early access to new features, AI updates, and weekly growth tips — straight to your inbox. No spam. Just signal.
        </p>
        <div class="flex flex-col sm:flex-row gap-2 mb-3">
          <input type="email" placeholder="Your email address" class="flex-1 bg-white/[0.04] border border-white/10 rounded-[9px] px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/20" />
          <button class="w-full sm:w-auto bg-white text-gray-900 text-sm font-semibold px-5 py-3 rounded-[9px] hover:bg-white/90 transition">Subscribe →</button>
        </div>
        <p class="text-[11px] text-white/22">We respect your inbox. Unsubscribe anytime.</p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-start gap-4 p-4 bg-[#111] border border-white/7 rounded-xl">
          <div class="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-sm flex-shrink-0">🚀</div>
          <div>
            <div class="text-xs font-semibold text-white/75 mb-1">Early feature access</div>
            <div class="text-[11px] text-white/35 leading-relaxed">Be first to try new Taskflow features before they go public — AI updates, new trackers, and more.</div>
          </div>
        </div>
        <div class="flex items-start gap-4 p-4 bg-[#111] border border-white/7 rounded-xl">
          <div class="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-sm flex-shrink-0">🧠</div>
          <div>
            <div class="text-xs font-semibold text-white/75 mb-1">Weekly growth tips</div>
            <div class="text-[11px] text-white/35 leading-relaxed">Practical self-improvement insights — built around the same habits Taskflow tracks for you every day.</div>
          </div>
        </div>
        <div class="flex items-start gap-4 p-4 bg-[#111] border border-white/7 rounded-xl">
          <div class="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-sm flex-shrink-0">📊</div>
          <div>
            <div class="text-xs font-semibold text-white/75 mb-1">Community insights</div>
            <div class="text-[11px] text-white/35 leading-relaxed">See what's working for other Taskflow users — habits, streaks, and patterns from the community.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="w-full px-6 md:px-[64px] py-16 md:py-[112px] bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div class="text-center mb-12">
      <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">FAQ</p>
      <h2 class="section-h2-lg text-[38px] font-bold leading-[1.08] mb-4" style="letter-spacing:-1.5px;">
        Questions? We got you.<br>
        <span class="text-white/28">Answers to everything.</span>
      </h2>
      <p class="text-sm text-white/38 leading-relaxed max-w-[560px] mx-auto">
        Everything you need to know about Taskflow — how it works, what's free, and what makes it different.
      </p>
    </div>

    <div class="flex gap-2 justify-center mb-10 flex-wrap">
      <button class="bg-white/10 border border-white/20 text-white/80 rounded-full px-4 py-1.5 text-xs cursor-pointer font-medium">All</button>
      <button class="bg-white/[0.04] border border-white/[0.08] text-white/40 rounded-full px-4 py-1.5 text-xs cursor-pointer hover:text-white/65 transition">AI &amp; Features</button>
      <button class="bg-white/[0.04] border border-white/[0.08] text-white/40 rounded-full px-4 py-1.5 text-xs cursor-pointer hover:text-white/65 transition">Pricing</button>
      <button class="bg-white/[0.04] border border-white/[0.08] text-white/40 rounded-full px-4 py-1.5 text-xs cursor-pointer hover:text-white/65 transition">Privacy</button>
      <button class="bg-white/[0.04] border border-white/[0.08] text-white/40 rounded-full px-4 py-1.5 text-xs cursor-pointer hover:text-white/65 transition">Getting started</button>
    </div>

    <div class="max-w-[900px] mx-auto mb-14">
      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">Is Taskflow actually free?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Yes — completely free. Tasks, habits, journal, calendar, accountability tracker, and the AI brain are all free. No credit card, no trial period, no "free tier" tricks. We may add a premium plan in the future for advanced features, but the core app will always be free.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">How does the AI actually work?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">The AI studies everything you put into Taskflow — your task completion rates, habit streaks, journal entries, and time patterns. Over time it finds correlations you'd never notice yourself and uses those insights to guide your daily plan, give you proactive nudges, and coach you when you're slipping.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">What makes Taskflow different from other productivity apps?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Most apps track one thing. Taskflow tracks everything — and the AI connects the dots between all of it. No other free app gives you tasks + habits + journal + accountability + an AI coach in one place. The accountability tracker especially is something you'd normally pay $12/month for separately.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">What is the accountability tracker?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">The accountability tracker lets you track streaks for things most apps won't touch — NoFap, NoPorn, screen time limits, junk food, or any custom challenge you create. It has a day counter, reset logging, and AI reflection prompts when you relapse. It's private, free, and built for real people dealing with real struggles.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">Is my data private and secure?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Your data is yours. We encrypt everything and never sell your information to third parties. Your journal entries, accountability data, and personal habits are private by default. You control what you share and what stays private — especially important because Taskflow deals with sensitive personal data.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">Does it work on mobile?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Taskflow is fully responsive and works on any device through your browser right now. A dedicated iOS and Android app is on the roadmap. For now, you can add it to your home screen on mobile for an app-like experience.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">How do I get started?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Just sign up — it takes 60 seconds and no credit card is needed. Add your first task, create a habit, and write a quick journal entry. The AI starts learning from your very first interaction. Most users have their first personalized daily plan within 24 hours.</div>
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <div class="faq-q-text">Can I use Taskflow offline?</div>
          <div class="faq-icon">+</div>
        </div>
        <div class="faq-a">
          <div class="faq-a-inner">Basic features work offline and sync when you reconnect. The AI features require an internet connection since they run on our servers. Offline support is being improved with each update.</div>
        </div>
      </div>
    </div>

    <div class="max-w-[900px] mx-auto bg-[#111] border border-white/[0.07] rounded-2xl px-5 md:px-9 py-6 md:py-8 flex items-center justify-between gap-6 flex-wrap">
      <div>
        <div class="text-sm font-bold text-white/85 mb-1">Still have questions?</div>
        <div class="text-xs text-white/35">We're real people — reach out and we'll get back to you fast.</div>
      </div>
      <div class="flex gap-2">
        <a href="/register" class="bg-white text-gray-900 text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 transition">Start for free →</a>
        <a href="/contact" class="bg-transparent text-white/45 text-xs border border-white/10 px-4 py-2.5 rounded-lg hover:border-white/20 hover:text-white/65 transition">Contact us</a>
      </div>
    </div>
  </div>
</section>

<footer class="w-full border-t border-white/[0.07] px-6 md:px-[56px] pt-16 pb-10 bg-[#0A0A0A] text-white">
  <div class="max-w-[1280px] mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
      <div class="flex flex-col gap-4 md:col-span-2">
        <a href="/" class="flex items-center gap-2 text-white/90 font-bold text-base w-fit">
          <div class="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="#0A0A0A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
          TaskFlow
        </a>
        <p class="text-sm text-white/35 leading-relaxed max-w-[280px]">
          Your personal growth OS. Tasks, habits, journal, accountability, and AI — all in one place. Free forever.
        </p>
        <a href="/register" class="inline-flex items-center gap-1.5 bg-white text-gray-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/88 transition w-fit">
          Start for free →
        </a>
        <div class="inline-flex items-center gap-1.5 text-[11px] text-white/30 bg-white/[0.03] border border-white/[0.07] rounded-full px-3 py-1 w-fit mt-1">
          <div class="w-1.5 h-1.5 rounded-full bg-green-400" style="box-shadow:0 0 6px rgba(74,222,128,0.5)"></div>
          All systems operational
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Product</div>
        <a href="/features" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Features</a>
        <a href="/pricing" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Pricing</a>
        <a href="/premium" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Premium</a>
        <a href="/changelog" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Changelog</a>
        <a href="/roadmap" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Roadmap</a>
      </div>

      <div class="flex flex-col gap-3">
        <div class="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Company</div>
        <a href="/about" class="text-sm text-white/35 hover:text-white/70 transition w-fit">About</a>
        <a href="/blog" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Blog</a>
        <a href="/contact" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Contact</a>
        <a href="/privacy" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Privacy Policy</a>
        <a href="/terms" class="text-sm text-white/35 hover:text-white/70 transition w-fit">Terms of Service</a>
      </div>
    </div>

    <div class="flex items-center justify-between flex-wrap gap-4 pt-7 border-t border-white/[0.06]">
      <div class="text-xs text-white/22">
        © 2026 <span class="text-white/40">TaskFlow</span>. All rights reserved. Built by <span class="text-white/40">Donny Fabuluje</span>.
      </div>
      <div class="flex items-center gap-2">
        <a href="#" class="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/35 text-xs hover:border-white/18 hover:text-white/65 hover:bg-white/[0.04] transition">𝕏</a>
        <a href="https://github.com/Donnyfab/TaskFlow" class="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/35 text-xs hover:border-white/18 hover:text-white/65 hover:bg-white/[0.04] transition">⌥</a>
        <a href="#" class="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/35 text-xs hover:border-white/18 hover:text-white/65 hover:bg-white/[0.04] transition">◈</a>
      </div>
      <div class="flex gap-5">
        <a href="/privacy" class="text-xs text-white/22 hover:text-white/50 transition">Privacy</a>
        <a href="/terms" class="text-xs text-white/22 hover:text-white/50 transition">Terms</a>
        <a href="/contact" class="text-xs text-white/22 hover:text-white/50 transition">Contact</a>
      </div>
    </div>
  </div>
</footer>
`.replaceAll('/register', '/auth/register')
