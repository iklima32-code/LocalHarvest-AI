import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptToken } from "@/lib/encryption";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
    try {
        const { pageId, pageName, pageAccessToken } = await req.json();
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
            return NextResponse.json({ error: "Failed to save to database: " + updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Facebook connect API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
