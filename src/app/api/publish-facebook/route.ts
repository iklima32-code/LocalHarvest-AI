import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptToken } from "@/lib/encryption";

export async function POST(req: Request) {
const supabaseAdmin = getSupabaseAdmin();
    try {
        const { caption, imageUrl, videoUrl, postBusiness, postPersonal, userId } = await req.json();

        // 1. Get the current user ID
        if (!userId) {
            return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
        }

        // 2. Fetch integration credentials from user's profile in the database
        const { data: profile } = await getSupabaseAdmin()
            .from('profiles')
            .select('fb_page_id, fb_page_access_token')
            .eq('id', userId)
            .single();

        const pageId = profile?.fb_page_id;
        const encryptedPageToken = profile?.fb_page_access_token;

        // If credentials are missing, return a helpful error
        if (!pageId || !encryptedPageToken) {
            return NextResponse.json(
                {
                    error: "Facebook page not connected.",
                    details: "Please go to Settings > Integrations to connect your Facebook Business Page."
                },
                { status: 400 }
            );
        }

        // 3. Decrypt the page access token
        const pageAccessToken = decryptToken(encryptedPageToken);

        const results = {
            business: { success: false, error: null as string | null, id: null },
            personal: { success: false, error: null as string | null, note: "" }
        };

        // 4. Post to Business Page via Facebook Graph API
        if (postBusiness) {
            try {
                let fbUrl: string;
                let fbBody: Record<string, string>;

                if (videoUrl) {
                    // Video post: use /videos endpoint with file_url
                    fbUrl = `https://graph.facebook.com/v25.0/${pageId}/videos`;
                    fbBody = {
                        access_token: pageAccessToken,
                        description: caption,
                        file_url: videoUrl,
                    };
                } else if (imageUrl) {
                    // Photo post: use /photos endpoint with url
                    fbUrl = `https://graph.facebook.com/v25.0/${pageId}/photos`;
                    fbBody = {
                        access_token: pageAccessToken,
                        message: caption,
                        url: imageUrl,
                    };
                } else {
                    // Text-only post: use /feed endpoint
                    fbUrl = `https://graph.facebook.com/v25.0/${pageId}/feed`;
                    fbBody = {
                        access_token: pageAccessToken,
                        message: caption,
                    };
                }

                const fbRes = await fetch(fbUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fbBody)
                });

                const fbData = await fbRes.json();

                if (fbData.error) {
                    throw new Error(fbData.error.message);
                }

                results.business = { success: true, error: null, id: fbData.id || fbData.post_id };
            } catch (error: any) {
                console.error("Facebook Business Page Post Error:", error);
                results.business = { success: false, error: error.message, id: null };
            }
        }

        // 5. Handle Personal Profile Posting
        // NOTE: Facebook deprecated API posting to Personal Timelines in Graph API v3.0 (2018).
        // To post to a personal profile, the recommended Facebook approach is using the Frontend Share Dialog.
        if (postPersonal) {
            results.personal.note = "Facebook API does not allow direct publishing to personal timelines. We recommend using the FB Share Dialog on the frontend for personal posts.";
        }

        // If both failed or business failed when it was requested
        if (postBusiness && !results.business.success) {
            return NextResponse.json({ 
                error: results.business.error || "Failed to post to Facebook Page", 
                results 
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Critical Facebook API Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to connect to Facebook" }, { status: 500 });
    }
}
