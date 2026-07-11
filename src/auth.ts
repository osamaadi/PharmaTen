import NextAuth, { type DefaultSession } from "next-auth";
import type {} from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import type { UserRole, VerificationStatus } from "@/generated/prisma/enums";
import { verifyCredentials } from "@/lib/auth/credentials";

// JWT sessions carrying role/company/verification claims. RBAC decisions on
// state-changing actions must NOT trust these claims alone — server actions
// re-check the database (PRD Section 10: access control at the API layer).

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      companyId: string;
      verificationStatus: VerificationStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    companyId: string;
    verificationStatus: VerificationStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
    companyId: string;
    verificationStatus: VerificationStatus;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // App runs behind managed hosts/proxies (Vercel, local prod builds); host
  // header validation happens at the platform layer.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await verifyCredentials(
          credentials?.email,
          credentials?.password,
        );
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          verificationStatus: user.verificationStatus,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on sign-in; claims persist in the token after.
      if (user) {
        token.userId = user.id!;
        token.role = user.role;
        token.companyId = user.companyId;
        token.verificationStatus = user.verificationStatus;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.companyId = token.companyId;
      session.user.verificationStatus = token.verificationStatus;
      return session;
    },
  },
});
