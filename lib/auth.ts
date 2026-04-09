// file: lib/auth.ts — FIXED
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set — critical security misconfiguration.')
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Prevent oversized inputs from hitting bcrypt (DoS protection)
        if (credentials.email.length > 255 || credentials.password.length > 128) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        // FIX: Constant-time comparison even when user doesn't exist
        // prevents timing-based email enumeration
        const fakeHash = '$2a$12$invalidhashtopreventtimingattack000000000000000000000000'
        const valid = await bcrypt.compare(credentials.password, user?.password ?? fakeHash)

        if (!user || !valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.roleVerifiedAt = Date.now()
      }

      // FIX #11: Re-verify role from DB every 5 min so admin revocations
      // take effect quickly instead of lasting the full 30-day JWT lifetime
      const ROLE_TTL_MS = 5 * 60 * 1000
      const roleVerifiedAt = token.roleVerifiedAt as number | undefined
      const shouldRefresh =
        trigger === 'update' || !roleVerifiedAt || Date.now() - roleVerifiedAt > ROLE_TTL_MS

      if (shouldRefresh && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.roleVerifiedAt = Date.now()
          } else {
            return null as any // User deleted — invalidate token
          }
        } catch {
          // DB unavailable — keep existing role, don't break auth
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
}
