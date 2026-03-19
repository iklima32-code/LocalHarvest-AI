import { NextResponse } from "next/server";
import { cqraRequireAuth } from "@/lib/cqra";

const FAL_MODEL = "fal-ai/wan-t2v";

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

        if (!process.env.FAL_KEY) {
            return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
        }

        const headers = { Authorization: `Key ${process.env.FAL_KEY}` };

        // Check status first
        const statusRes = await fetch(
            `https://queue.fal.run/${FAL_MODEL}/requests/${predictionId}/status`,
            { headers }
        );

        if (!statusRes.ok) {
            const err = await statusRes.json().catch(() => ({}));
            return NextResponse.json(
                { error: err.detail || "Failed to poll prediction" },
                { status: statusRes.status }
            );
        }

        const statusData = await statusRes.json();
        // fal.ai statuses: IN_QUEUE | IN_PROGRESS | COMPLETED | FAILED
        const falStatus = statusData.status as string;

        if (falStatus === "COMPLETED") {
            // Fetch the result
            const resultRes = await fetch(
                `https://queue.fal.run/${FAL_MODEL}/requests/${predictionId}`,
                { headers }
            );
            const result = await resultRes.json();
            const videoUrl = result?.video?.url ?? null;

            return NextResponse.json({ status: "succeeded", videoUrl, error: null });
        }

        if (falStatus === "FAILED") {
            return NextResponse.json({
                status: "failed",
                videoUrl: null,
                error: statusData.error || "Video generation failed",
            });
        }

        // IN_QUEUE or IN_PROGRESS — still running
        return NextResponse.json({ status: "processing", videoUrl: null, error: null });

    } catch (error: any) {
        console.error("Poll video error:", error);
        return NextResponse.json({ error: error.message || "Failed to poll video" }, { status: 500 });
    }
}
