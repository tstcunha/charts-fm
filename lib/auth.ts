import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

/**
 * Get the current user from the database using the session user ID.
 * This is safer than using session.user.email because email can change,
 * but the user ID in the session remains constant.
 * 
 * @returns The user from the database, or null if not found/not authenticated
 */
export async function getCurrentUserFromDB() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    return user
  } catch (error) {
    console.error('Error fetching current user from database:', error)
    return null
  }
}

