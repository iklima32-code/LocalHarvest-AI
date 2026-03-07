import { NextRequest, NextResponse } from "next/server";
import { encryptToken } from "@/lib/encryption";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(`${appUrl}/settings?tab=connections&linkedin=error`);
    }

    try {
        // 1. Exchange code for access token
        const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: clientId!,
                client_secret: clientSecret!,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            throw new Error("No access token returned from LinkedIn");
        }

        // 2. Fetch the user's LinkedIn person URN via OpenID userinfo endpoint
        const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userInfo = await userInfoRes.json();
        // OpenID sub field contains the person ID; URN format: urn:li:person:{sub}
        const personUrn = `urn:li:person:${userInfo.sub}`;

        // 3. Get the current Supabase user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.redirect(`${appUrl}/settings?tab=connections&linkedin=error`);
        }

        // 4. Encrypt and store
        const encryptedToken = encryptToken(tokenData.access_token);

        await supabase
            .from("profiles")
            .update({
                linkedin_access_token: encryptedToken,
                linkedin_person_urn: personUrn,
            })
            .eq("id", user.id);

        return NextResponse.redirect(`${appUrl}/settings?tab=connections&linkedin=connected`);
    } catch (err: any) {
        console.error("LinkedIn OAuth callback error:", err);
        return NextResponse.redirect(`${appUrl}/settings?tab=connections&linkedin=error`);
    }
}
