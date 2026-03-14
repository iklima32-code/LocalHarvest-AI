import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptToken } from "@/lib/encryption";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
    try {
        const { pageId, pageName, pageAccessToken, userAccessToken } = await req.json();
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
        }

        // Create a server-side Supabase client with the user's auth token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // 1. Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("Auth error in API:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let finalPageAccessToken = pageAccessToken;
        let isLongLived = false;

        // 2. Attempt to exchange for a long-lived page token if App Secret is configured
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (appId && appSecret && userAccessToken) {
            try {
                // Step A: Exchange short-lived user token for long-lived user token
                const exchangeUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
                const exchangeRes = await fetch(exchangeUrl);
                const exchangeData = await exchangeRes.json();

                if (exchangeData.access_token) {
                    const longLivedUserToken = exchangeData.access_token;
                    
                    // Step B: Use long-lived user token to fetch accounts (pages), and find the long-lived page token
                    const accountsUrl = `https://graph.facebook.com/v25.0/me/accounts?access_token=${longLivedUserToken}`;
                    const accountsRes = await fetch(accountsUrl);
                    const accountsData = await accountsRes.json();

                    if (accountsData.data) {
                        const targetPage = accountsData.data.find((p: any) => p.id === pageId);
                        if (targetPage && targetPage.access_token) {
                            finalPageAccessToken = targetPage.access_token;
                            isLongLived = true;
                            console.log("Successfully retrieved long-lived Facebook Page token.");
                        }
                    }
                } else {
                    console.warn("Failed to exchange for long-lived user token:", exchangeData);
                }
            } catch (exchangeError) {
                console.error("Error exchanging Facebook token:", exchangeError);
            }
        } else {
            console.log("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not configured. Saving short-lived token.");
        }

        // 3. Encrypt the page access token before storing
        const encryptedToken = encryptToken(finalPageAccessToken);

        // 3. Update the user's profile in Supabase
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                fb_page_id: pageId,
                fb_page_name: pageName,
                fb_page_access_token: encryptedToken,
                fb_connected_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error("Database update error:", updateError);
            return NextResponse.json({ error: "Failed to save to database: " + updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Facebook connect API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
