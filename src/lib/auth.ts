import GoogleProvider from "next-auth/providers/google";
import db from "@/lib/db";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
    error: '/',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const userEmail = user.email.toLowerCase().trim();
      const masterAdmin = process.env.MASTER_ADMIN_EMAIL?.toLowerCase().trim();
      
      if (userEmail === masterAdmin) return true;

      try {
        const authUser = await db.authorizedUser.findUnique({
          where: { email: userEmail }
        });
        
        if (authUser) {
          await db.authorizedUser.update({
            where: { id: authUser.id },
            data: {
              name: user.name,
              image: user.image,
              lastSeen: new Date(),
            }
          });
          
          await db.auditLog.create({
            data: {
              userId: authUser.id,
              action: 'LOGIN',
              details: `Login realizado via Google: ${user.name}`
            }
          });
          
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error checking auth user:', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const userEmail = user.email.toLowerCase().trim();
        const masterAdmin = process.env.MASTER_ADMIN_EMAIL?.toLowerCase().trim();
        token.isAdmin = userEmail === masterAdmin;
        
        const dbUser = await db.authorizedUser.findUnique({
          where: { email: userEmail }
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin;
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
