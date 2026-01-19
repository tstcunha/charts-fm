import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const emailLower = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email: emailLower }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Allow login regardless of email verification status
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    }),
    CredentialsProvider({
      id: "lastfm",
      name: "Last.fm",
      credentials: {
        lastfmUsername: { label: "Last.fm Username", type: "text" },
        lastfmSessionKey: { label: "Last.fm Session Key", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.lastfmUsername || !credentials?.lastfmSessionKey) {
          return null
        }

        // Find user by Last.fm username
        const user = await prisma.user.findUnique({
          where: { lastfmUsername: credentials.lastfmUsername }
        })

        if (!user) {
          return null
        }

        // Allow login regardless of email verification status
        // Update the session key if it's different
        if (user.lastfmSessionKey !== credentials.lastfmSessionKey) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastfmSessionKey: credentials.lastfmSessionKey }
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        
        // Validate that the user still exists in the database and update session with current data
        // This prevents issues after database migrations/wipes and ensures email is current
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { 
              id: true,
              email: true,
              name: true,
              image: true
            }
          })
          
          // If user doesn't exist, clear the session
          if (!user) {
            // Return session with null user - this will make useSession return unauthenticated
            return {
              ...session,
              user: null as any,
            }
          }
          
          // Update session with current user data from database
          // This ensures email, name, and image are always up-to-date after changes
          session.user.email = user.email
          session.user.name = user.name
          session.user.image = user.image
        } catch (error) {
          // If there's an error checking the user, also invalidate the session
          console.error('Error validating user in session:', error)
          return {
            ...session,
            user: null as any,
          }
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // After successful login, redirect to dashboard
      // The middleware will handle adding the locale prefix based on user preference
      if (url === `${baseUrl}/api/auth/signin` || url === baseUrl) {
        return `${baseUrl}/en/dashboard`
      }
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
  pages: {
    signIn: "/",
  },
}

