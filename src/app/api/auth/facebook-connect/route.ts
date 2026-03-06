import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encryptToken } from "@/lib/encryption";

export async function POST(req: Request) {
    try {
        const { pageId, pageName, pageAccessToken } = await req.json();

        // 1. Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Encrypt the page access token before storing
        const encryptedToken = encryptToken(pageAccessToken);

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
            return NextResponse.json({ error: "Failed to save to database" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Facebook connect API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
