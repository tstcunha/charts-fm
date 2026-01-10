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

        // Check if email is verified
        if (!user.emailVerified) {
          // Return null to indicate authentication failure
          // The frontend will check verification status separately
          return null
        }

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

        // Check if email is verified
        if (!user.emailVerified) {
          // Return null to prevent login - user must verify email first
          return null
        }

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
        
        // Validate that the user still exists in the database and email is verified
        // This prevents issues after database migrations/wipes and ensures email verification
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, emailVerified: true }
          })
          
          // If user doesn't exist or email is not verified, clear the session
          if (!user || !user.emailVerified) {
            // Return session with null user - this will make useSession return unauthenticated
            return {
              ...session,
              user: null as any,
            }
          }
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

