import NextAuth, { NextAuthOptions } from "next-auth"
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
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
        
        // Validate that the user still exists in the database
        // This prevents issues after database migrations/wipes
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true }
          })
          
          // If user doesn't exist, clear the session by returning null user
          if (!user) {
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
      if (url === `${baseUrl}/api/auth/signin` || url === baseUrl) {
        return `${baseUrl}/dashboard`
      }
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
  pages: {
    signIn: "/",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

