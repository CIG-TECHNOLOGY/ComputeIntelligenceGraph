import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const config: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    {
      id: "authentik",
      name: "CIG SSO",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER,
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
    },
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email as string;
        token.name = profile.name as string;
        // Authentik passes groups; CIG staff are in "cig-admins" group
        const groups = (profile as { groups?: string[] }).groups ?? [];
        token.isSuperAdmin = groups.includes("cig-admins");
      }
      return token;
    },
    async session({ session, token }) {
      session.user.isSuperAdmin = token.isSuperAdmin as boolean;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
