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
          <h1>Stop juggling apps.<br/><span className="dim">Start becoming who</span><br/>you're supposed to be.</h1>
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
                  <div className="ai-card"><div className="ai-pip">✦</div><div className="ai-text"><strong>AI insight —</strong> You finish 40% more tasks on days you work out first. Your workout is at 8am today. Don't skip it.</div></div>
                  <div className="section-header"><div className="section-title">Today's priorities</div><div className="section-add">+ Add</div></div>
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
                  <div className="section-header"><div className="section-title">Today's habits</div></div>
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
                  <div className="journal-prompt">✦ AI prompt: "You completed 5 tasks today. What drove that momentum — and how do you keep it tomorrow?"</div>
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
                  <div className="acc-reflection">✦ "You'