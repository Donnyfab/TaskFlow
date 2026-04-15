/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.BACKEND_PROXY_URL || 'https://tflow.live').replace(/\/$/, '')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendOrigin}/api/:path*` },
      { source: '/tasks/quick', destination: `${backendOrigin}/tasks/quick` },
      { source: '/tasks/toggle/:path*', destination: `${backendOrigin}/tasks/toggle/:path*` },
      { source: '/tasks/delete/:path*', destination: `${backendOrigin}/tasks/delete/:path*` },
      { source: '/tasks/update/:path*', destination: `${backendOrigin}/tasks/update/:path*` },
      { source: '/lists/create', destination: `${backendOrigin}/lists/create` },
      { source: '/habits/create', destination: `${backendOrigin}/habits/create` },
      { source: '/habits/:path*/toggle', destination: `${backendOrigin}/habits/:path*/toggle` },
      { source: '/habits/:path*/delete', destination: `${backendOrigin}/habits/:path*/delete` },
      { source: '/journal/quick', destination: `${backendOrigin}/journal/quick` },
      { source: '/journal/new', destination: `${backendOrigin}/journal/new` },
      { source: '/journal/save/:path*', destination: `${backendOrigin}/journal/save/:path*` },
      { source: '/focus/sessions/:path*', destination: `${backendOrigin}/focus/sessions/:path*` },
      { source: '/calendar/sync-google', destination: `${backendOrigin}/calendar/sync-google` },
      { source: '/ai/chat', destination: `${backendOrigin}/ai/chat` },
      { source: '/ai/plan', destination: `${backendOrigin}/ai/plan` },
      { source: '/ai/threads/create', destination: `${backendOrigin}/ai/threads/create` },
      { source: '/ai/projects/create', destination: `${backendOrigin}/ai/projects/create` },
      { source: '/ai/actions/:path*', destination: `${backendOrigin}/ai/actions/:path*` },
      { source: '/ai/journal-insight', destination: `${backendOrigin}/ai/journal-insight` },
      { source: '/login/google', destination: `${backendOrigin}/login/google` },
      { source: '/register', destination: `${backendOrigin}/register` },
      { source: '/accountreset', destination: `${backendOrigin}/accountreset` },
      { source: '/upload_profile', destination: `${backendOrigin}/upload_profile` },
      { source: '/terms', destination: `${backendOrigin}/terms` },
      { source: '/privacy', destination: `${backendOrigin}/privacy` },
      { source: '/logout', destination: `${backendOrigin}/logout` },
    ]
  },
}

module.exports = nextConfig
