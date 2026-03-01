import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { caption, imageUrl, postBusiness, postPersonal } = await req.json();

        // 1. Gather Facebook API Credentials from environment variables
        const pageId = process.env.FACEBOOK_PAGE_ID;
        const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

        // If credentials are missing, return a helpful error so the user knows what to configure
        if (!pageId || !pageAccessToken) {
            return NextResponse.json(
                {
                    error: "Facebook API credentials missing.",
                    details: "Please add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN to your .env file."
                },
                { status: 400 }
            );
        }

        const results = {
            business: { success: false, error: null as string | null, id: null },
            personal: { success: false, error: null as string | null, note: "" }
        };

        // 2. Post to Business Page via Facebook Graph API
        if (postBusiness) {
            try {
                let fbUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;

                // If there's no image URL, we post a feed status instead of a photo
                if (!imageUrl) {
                    fbUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
                }

                const fbRes = await fetch(fbUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: pageAccessToken,
                        message: caption,
                        ...(imageUrl && { url: imageUrl }) // Attach image URL if available
                    })
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

        // 3. Handle Personal Profile Posting
        // NOTE: Facebook deprecated API posting to Personal Timelines in Graph API v3.0 (2018).
        // To post to a personal profile, the recommended Facebook approach is using the Frontend Share Dialog.
        if (postPersonal) {
            results.personal.note = "Facebook API does not allow direct publishing to personal timelines. We recommend using the FB Share Dialog on the frontend for personal posts.";
        }

        // If both failed or business failed when it was requested
        if (postBusiness && !results.business.success) {
            return NextResponse.json({ error: "Failed to post to Facebook Page", results }, { status: 500 });
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Critical Facebook API Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to connect to Facebook" }, { status: 500 });
    }
}
