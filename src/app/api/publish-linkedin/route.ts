import { NextResponse } from "next/server";
import { decryptToken } from "@/lib/encryption";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { caption, imageUrl, videoUrl, userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Fetch encrypted token and URN from profiles
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("linkedin_access_token, linkedin_person_urn")
            .eq("id", userId)
            .single();

        if (profileError || !profile?.linkedin_access_token || !profile?.linkedin_person_urn) {
            return NextResponse.json(
                { error: "LinkedIn not connected. Please connect your LinkedIn account in Settings > Integrations." },
                { status: 400 }
            );
        }

        // 2. Decrypt token
        const accessToken = decryptToken(profile.linkedin_access_token);
        const authorUrn = profile.linkedin_person_urn;

        let shareMediaCategory = "NONE";
        let media: object[] | undefined;

        // 3a. If video present, upload via LinkedIn Assets API (video flow)
        if (videoUrl) {
            const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
                        owner: authorUrn,
                        serviceRelationships: [
                            {
                                relationshipType: "OWNER",
                                identifier: "urn:li:userGeneratedContent",
                            },
                        ],
                        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
                    },
                }),
            });

            const registerData = await registerRes.json();
            const uploadUrl = registerData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
            const assetUrn = registerData?.value?.asset;

            if (uploadUrl && assetUrn) {
                const videoRes = await fetch(videoUrl);
                const contentType = videoRes.headers.get("content-type") || "video/mp4";
                const videoBuffer = await videoRes.arrayBuffer();

                await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": contentType,
                    },
                    body: videoBuffer,
                });

                shareMediaCategory = "VIDEO";
                media = [
                    {
                        status: "READY",
                        description: { text: caption.slice(0, 200) },
                        media: assetUrn,
                        title: { text: "Harvest Update" },
                    },
                ];
            }
        }

        // 3b. If image present (and no video), upload via LinkedIn Assets API (image flow)
        if (!videoUrl && imageUrl) {
            // Register the image upload
            const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                        owner: authorUrn,
                        serviceRelationships: [
                            {
                                relationshipType: "OWNER",
                                identifier: "urn:li:userGeneratedContent",
                            },
                        ],
                    },
                }),
            });

            const registerData = await registerRes.json();
            const uploadUrl = registerData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
            const assetUrn = registerData?.value?.asset;

            if (uploadUrl && assetUrn) {
                // Fetch the image and upload to LinkedIn
                const imageRes = await fetch(imageUrl);
                const imageBuffer = await imageRes.arrayBuffer();

                await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "image/jpeg",
                    },
                    body: imageBuffer,
                });

                shareMediaCategory = "IMAGE";
                media = [
                    {
                        status: "READY",
                        description: { text: caption.slice(0, 200) },
                        media: assetUrn,
                        title: { text: "Harvest Update" },
                    },
                ];
            }
        }

        // 4. POST to LinkedIn UGC Posts API
        const ugcBody: any = {
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: caption },
                    shareMediaCategory,
                    ...(media && { media }),
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        };

        const ugcRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify(ugcBody),
        });

        const ugcData = await ugcRes.json();

        if (!ugcRes.ok) {
            throw new Error(ugcData.message || JSON.stringify(ugcData));
        }

        return NextResponse.json({ success: true, id: ugcData.id });
    } catch (error: any) {
        console.error("LinkedIn publish error:", error);
        return NextResponse.json({ error: error.message || "Failed to publish to LinkedIn" }, { status: 500 });
    }
}
