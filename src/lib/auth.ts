import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { UserRole } from '@/lib/constants';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user || user.isSuspended) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role as UserRole,
          avatar: user.avatar,
          isVerified: user.isVerified,
          language: user.language,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        token.avatar = user.avatar;
        token.isVerified = user.isVerified;
        token.language = user.language;
      }
      // Allow client-side `update()` calls to refresh cached profile fields
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.avatar !== undefined) token.avatar = session.avatar;
        if (session.isVerified !== undefined) token.isVerified = session.isVerified;
        if (session.language) token.language = session.language;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.phone = token.phone as string;
        session.user.avatar = (token.avatar as string | null) ?? null;
        session.user.isVerified = token.isVerified as boolean;
        session.user.language = (token.language as string) ?? 'en';
      }
      return session;
    },
  },
});

export const ROLE_HOME: Record<UserRole, string> = {
  TENANT: '/tenant',
  LANDLORD: '/landlord',
  ADMIN: '/admin',
};
