import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !appUrl) {
        return NextResponse.json(
            { error: "LinkedIn OAuth not configured. Add LINKEDIN_CLIENT_ID and NEXT_PUBLIC_APP_URL to your .env file." },
            { status: 500 }
        );
    }

    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
    const scope = "w_member_social openid profile";

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);

    return NextResponse.redirect(authUrl.toString());
}
