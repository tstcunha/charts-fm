import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LandingPageClient from './LandingPageClient'

export default async function Home() {
  const session = await getSession()

  // Only redirect if we have a valid session with email
  // This prevents redirect loops if session exists but user was deleted
  if (session?.user?.email) {
    // Verify user still exists in database before redirecting
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })
    
    if (user) {
      redirect('/dashboard')
    }
    // If user doesn't exist, don't redirect - let them see the home page
  }

  return <LandingPageClient />
}

