// Utility functions for checking group membership and access control

import { redirect } from 'next/navigation'
import { getSession } from './auth'
import { prisma } from './prisma'
import { getGroupById } from './group-queries'
import { routing } from '@/i18n/routing'

/**
 * Ensures the user is authenticated and is a member or creator of the group.
 * Redirects to public page if not a member, or shows "Group not found" if group doesn't exist.
 * 
 * @param groupId - The group ID to check
 * @returns Object with user and group if access is granted
 */
export async function requireGroupMembership(groupId: string) {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      locale: true,
    },
  })

  if (!user) {
    redirect('/')
  }
  
  // Get user's locale or use default
  const userLocale = user.locale || routing.defaultLocale

  // First check if the group exists (without membership restriction)
  const groupExists = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true },
  })

  if (!groupExists) {
    // Group doesn't exist - this will be handled by the calling page
    return { user, group: null }
  }

  // Check if user is a member or creator
  const group = await getGroupById(groupId, user.id)
  
  // If group exists but user is not a member, redirect to public page with user's locale
  if (!group) {
    redirect(`/${userLocale}/groups/${groupId}/public`)
  }

  return { user, group }
}

/**
 * Gets group access information for both members and non-members.
 * Does NOT redirect - allows pages to decide what to show based on isMember flag.
 * 
 * SECURITY: This function enforces private group access control:
 * - Non-authenticated users: Can only access public groups (returns null group for private groups)
 * - Authenticated non-members: Can access public groups, but NOT private groups (returns null group for private groups)
 * - Authenticated members: Can access both public and private groups
 * 
 * @param groupId - The group ID to check
 * @returns Object with user (or null if not authenticated), group (or null if not found/not accessible), and isMember boolean
 */
export async function getGroupAccess(groupId: string) {
  const session = await getSession()
  
  // Get user if authenticated
  let user: { id: string; locale: string | null } | null = null
  if (session?.user?.email) {
    const foundUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        locale: true,
      },
    })
    if (foundUser) {
      user = foundUser
    }
  }

  // Use getGroupByIdForAccess to get group data (with or without members based on access)
  const { getGroupByIdForAccess } = await import('./group-queries')
  const group = await getGroupByIdForAccess(groupId, user?.id || null)
  
  if (!group) {
    return { user, group: null, isMember: false }
  }

  // For non-authenticated users, only allow public groups
  if (!user && group.isPrivate) {
    return { user: null, group: null, isMember: false }
  }

  // Check membership if user is authenticated
  let isMember = false
  if (user) {
    // Check if user is creator
    if (group.creatorId === user.id) {
      isMember = true
    } else {
      // Check if user is a member
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })
      isMember = !!membership
    }
  }

  // For authenticated users, allow access to public groups even if not a member
  // For private groups, only allow if they're a member
  if (user && group.isPrivate && !isMember) {
    return { user, group: null, isMember: false }
  }

  return { user, group, isMember }
}

/**
 * Helper function for API routes to check group access.
 * Returns group access info or throws an error that can be caught and returned as JSON response.
 * 
 * SECURITY: This function enforces private group access control:
 * - Private groups require authentication (401 if not authenticated)
 * - Private groups require membership (403 if not a member)
 * - Public groups are accessible to everyone (authenticated or not)
 * 
 * @param groupId - The group ID to check
 * @returns Object with user, group, and isMember, or throws error with status code
 */
export async function checkGroupAccessForAPI(groupId: string) {
  const { user, group, isMember } = await getGroupAccess(groupId)
  
  if (!group) {
    const error: any = new Error('Group not found')
    error.status = 404
    throw error
  }

  // For private groups, require authentication and membership
  if (group.isPrivate) {
    if (!user) {
      const error: any = new Error('Unauthorized')
      error.status = 401
      throw error
    }
    if (!isMember) {
      const error: any = new Error('You are not a member of this group')
      error.status = 403
      throw error
    }
  }

  return { user, group, isMember }
}

/**
 * Ensures the user is authenticated and is the creator of the group.
 * Redirects to public page if not a member, or to group page if member but not creator.
 * 
 * @param groupId - The group ID to check
 * @returns Object with user and group if access is granted
 */
export async function requireGroupCreator(groupId: string) {
  const { user, group } = await requireGroupMembership(groupId)
  
  if (!group) {
    // Group doesn't exist - this will be handled by the calling page
    return { user, group: null }
  }

  // Check if user is the creator
  if (group.creatorId !== user.id) {
    // If they're a member but not creator, redirect to group page
    // Otherwise, requireGroupMembership would have already redirected to public
    redirect(`/groups/${groupId}`)
  }

  return { user, group }
}

