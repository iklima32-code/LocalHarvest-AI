import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

export async function GET(req: Request) {
    const gate = await cqraRequireAuth(req, "poll_video");
    if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    try {
        const { searchParams } = new URL(req.url);
        const predictionId = searchParams.get("id");

        if (!predictionId) {
            return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 });
        }

        if (!process.env.REPLICATE_API_KEY) {
            return NextResponse.json({ error: "REPLICATE_API_KEY not configured" }, { status: 500 });
        }

        const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: err.detail || "Failed to poll prediction" },
                { status: res.status }
            );
        }

        const data = await res.json();

        // WAN 2.1 returns a single URL string as output
        const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output ?? null;

        return NextResponse.json({
            status: data.status,   // starting | processing | succeeded | failed | canceled
            videoUrl,
            error: data.error ?? null,
        });

    } catch (error: any) {
        console.error("Poll video error:", error);
        return NextResponse.json({ error: error.message || "Failed to poll video" }, { status: 500 });
    }
}
