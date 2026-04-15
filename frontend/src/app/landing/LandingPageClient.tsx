'use client'

import { useEffect } from 'react'
import { legacyLandingCss, legacyLandingHtml } from './legacyTemplate'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

declare global {
  interface Window {
    addTask?: () => void
    hiwAddMsg?: (type: string, name: string, text: string) => HTMLDivElement | undefined
    hiwAddTyping?: () => HTMLDivElement | undefined
    hiwSendMsg?: () => Promise<void>
    hiwSendSug?: (button: HTMLElement) => void
    switchTab?: (tab: string, el: HTMLElement) => void
    toggleFaq?: (el: HTMLElement) => void
    toggleHabit?: (el: HTMLElement) => void
    toggleProductsMenu?: () => void
    toggleTask?: (el: HTMLElement) => void
  }
}

export default function LandingPageClient() {
  useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide')
    document.body.classList.add('scrollbar-hide')

    const cleanupFns: Array<() => void> = []

    const primaryCtas = Array.from(document.querySelectorAll<HTMLButtonElement>('button.cta-main'))
    const handlePrimaryCta = () => {
      window.location.href = '/auth/register'
    }
    primaryCtas.forEach((button) => {
      button.addEventListener('click', handlePrimaryCta)
      cleanupFns.push(() => button.removeEventListener('click', handlePrimaryCta))
    })

    const secondaryCtas = Array.from(document.querySelectorAll<HTMLButtonElement>('button.cta-secondary'))
    const handleSecondaryCta = () => {
      document.querySelector('.hiw-step')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    secondaryCtas.forEach((button) => {
      button.addEventListener('click', handleSecondaryCta)
      cleanupFns.push(() => button.removeEventListener('click', handleSecondaryCta))
    })

    const menuOpen = document.getElementById('menuOpen')
    const menuClose = document.getElementById('menuClose')
    const mobileMenu = document.getElementById('mobileMenu')

    const openMenu = () => mobileMenu?.classList.remove('translate-x-full')
    const closeMenu = () => mobileMenu?.classList.add('translate-x-full')

    menuOpen?.addEventListener('click', openMenu)
    menuClose?.addEventListener('click', closeMenu)
    cleanupFns.push(() => menuOpen?.removeEventListener('click', openMenu))
    cleanupFns.push(() => menuClose?.removeEventListener('click', closeMenu))

    window.toggleProductsMenu = () => {
      const dropdown = document.getElementById('products-dropdown')
      if (!dropdown) return
      dropdown.classList.toggle('opacity-0')
      dropdown.classList.toggle('invisible')
      dropdown.classList.toggle('translate-y-2')
      dropdown.classList.toggle('opacity-100')
      dropdown.classList.toggle('visible')
      dropdown.classList.toggle('translate-y-0')
    }

    window.switchTab = (tab: string, el: HTMLElement) => {
      document.querySelectorAll<HTMLElement>('.sidebar-item').forEach((item) => {
        item.classList.remove('active')
        item.querySelector<HTMLElement>('.si-line')?.classList.remove('active')
      })

      el.classList.add('active')
      el.querySelector<HTMLElement>('.si-line')?.classList.add('active')

      document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => panel.classList.remove('active'))
      document.getElementById(`panel-${tab}`)?.classList.add('active')
    }

    window.toggleTask = (el: HTMLElement) => {
      el.classList.toggle('done')
      el.textContent = el.classList.contains('done') ? '✓' : ''
      el.nextElementSibling?.classList.toggle('done')
    }

    window.toggleHabit = (el: HTMLElement) => {
      el.classList.toggle('done')
      el.textContent = el.classList.contains('done') ? '✓' : ''
    }

    window.addTask = () => {
      const input = document.getElementById('new-task-input') as HTMLInputElement | null
      const value = input?.value.trim()
      if (!input || !value) return

      const list = document.getElementById('task-list-demo')
      const item = document.createElement('div')
      item.className = 'task-item'
      item.innerHTML =
        '<div class="task-check" onclick="window.toggleTask(this)"></div><div class="task-name"></div><div class="task-tag">Task</div>'
      item.querySelector('.task-name')!.textContent = value
      list?.appendChild(item)
      input.value = ''
    }

    const bar = document.getElementById('acc-bar-demo')
    if (bar && bar.childElementCount === 0) {
      for (let i = 0; i < 30; i += 1) {
        const day = document.createElement('div')
        day.className = `acc-day${i < 22 ? ' success' : ''}`
        bar.appendChild(day)
      }
    }

    const streakGrid = document.getElementById('streak-grid-lp')
    if (streakGrid && streakGrid.childElementCount === 0) {
      for (let i = 0; i < 91; i += 1) {
        const cell = document.createElement('div')
        const random = Math.random()
        const opacity =
          random < 0.15 ? '0.05' : random < 0.35 ? '0.1' : random < 0.6 ? '0.2' : random < 0.8 ? '0.35' : '0.55'
        cell.style.cssText = `height:14px; border-radius:2px; background:rgba(255,255,255,${opacity});`
        streakGrid.appendChild(cell)
      }
    }

    window.toggleFaq = (el: HTMLElement) => {
      const answer = el.nextElementSibling as HTMLElement | null
      const icon = el.querySelector<HTMLElement>('.faq-icon')
      const text = el.querySelector<HTMLElement>('.faq-q-text')
      const isOpen = answer?.classList.contains('open')

      document.querySelectorAll<HTMLElement>('.faq-a').forEach((item) => item.classList.remove('open'))
      document.querySelectorAll<HTMLElement>('.faq-icon').forEach((item) => item.classList.remove('open'))
      document.querySelectorAll<HTMLElement>('.faq-q-text').forEach((item) => item.classList.remove('open'))

      if (!isOpen) {
        answer?.classList.add('open')
        icon?.classList.add('open')
        text?.classList.add('open')
      }
    }

    const hiwHistory: Array<{ role: string; content: string }> = []

    window.hiwAddMsg = (type: string, name: string, text: string) => {
      const messages = document.getElementById('hiw-msgs')
      if (!messages) return

      const message = document.createElement('div')
      message.className = `hiw-cmsg ${type}`
      message.innerHTML = `<div class="hiw-cname">${name}</div><div class="hiw-cbubble ${type}">${text}</div>`
      messages.appendChild(message)
      messages.scrollTop = messages.scrollHeight
      return message
    }

    window.hiwAddTyping = () => {
      const messages = document.getElementById('hiw-msgs')
      if (!messages) return

      const message = document.createElement('div')
      message.className = 'hiw-cmsg ai'
      message.innerHTML =
        '<div class="hiw-cname">Taskflow AI</div><div class="hiw-cbubble ai" style="display:flex;gap:4px;align-items:center;"><span class="hiw-tdot"></span><span class="hiw-tdot"></span><span class="hiw-tdot"></span></div>'
      messages.appendChild(message)
      messages.scrollTop = messages.scrollHeight
      return message
    }

    window.hiwSendMsg = async () => {
      const input = document.getElementById('hiw-cinput') as HTMLInputElement | null
      const button = document.getElementById('hiw-csend') as HTMLButtonElement | null
      const message = input?.value.trim()

      if (!input || !button || !message) return

      input.value = ''
      button.disabled = true
      window.hiwAddMsg?.('user', 'You', message)
      hiwHistory.push({ role: 'user', content: message })

      const typing = window.hiwAddTyping?.()

      try {
        const response = await fetch(`${API}/ai/chat`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: hiwHistory,
            system:
              "You are Taskflow AI — a personal coach and accountability partner. You know the user: 14-day streak, 5/7 tasks done, 22-day NoFap streak, habits include morning workout and journaling. Speak like a real supportive friend. Keep responses SHORT (2-3 sentences max). Be direct and warm.",
          }),
        })

        const data = await response.json()
        const reply = data.reply || "I'm here — what do you need?"
        typing?.remove()
        hiwHistory.push({ role: 'assistant', content: reply })
        window.hiwAddMsg?.('ai', 'Taskflow AI', reply)
      } catch {
        typing?.remove()
        window.hiwAddMsg?.('ai', 'Taskflow AI', "I'm here for you. What's on your mind?")
      }

      button.disabled = false
    }

    window.hiwSendSug = (button: HTMLElement) => {
      const input = document.getElementById('hiw-cinput') as HTMLInputElement | null
      if (input) input.value = button.textContent || ''
      void window.hiwSendMsg?.()
    }

    return () => {
      document.documentElement.classList.remove('scrollbar-hide')
      document.body.classList.remove('scrollbar-hide')
      cleanupFns.forEach((cleanup) => cleanup())
      delete window.addTask
      delete window.hiwAddMsg
      delete window.hiwAddTyping
      delete window.hiwSendMsg
      delete window.hiwSendSug
      delete window.switchTab
      delete window.toggleFaq
      delete window.toggleHabit
      delete window.toggleProductsMenu
      delete window.toggleTask
    }
  }, [])

  return (
    <>
      <style>{legacyLandingCss}</style>
      <div dangerouslySetInnerHTML={{ __html: legacyLandingHtml }} />
    </>
  )
}
