import { redirect } from 'next/navigation'

// Middleware handles the smart redirect (cookie present → /home, absent → /auth/login).
// This server component is a fallback in case middleware doesn't match.
export default function RootPage() {
  redirect('/home')
}
