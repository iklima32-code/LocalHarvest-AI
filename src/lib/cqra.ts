/**
 * CQRA Phase A — Commitment Boundary Gate
 * policy: phase-a-v1
 *
 * Exports:
 *   cqraRequireAuth(req, surfaceId) — qualifies caller before a durable effect
 *   cqraAuditLog(...)              — emits metadata-only audit event
 *
 * Scope: authentication mediation only.
 * No scoring, thresholds, policy engines, or Phase B/C scaffolding.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const POLICY_VERSION = "phase-a-v1";

export type CqraPermit = { ok: true;  userId: string; userHash: string };
export type CqraDeny   = { ok: false; status: number; error: string };
export type CqraResult = CqraPermit | CqraDeny;

function hashId(id: string): string {
    return crypto.createHash("sha256").update(id).digest("hex").slice(0, 16);
}

/**
 * Emit an audit event containing metadata only.
 * MUST NOT contain: raw prompts, generated text, image bytes, API keys, or tokens.
 */
export function cqraAuditLog(
    surfaceId: string,
    decision: "PERMIT" | "DENY" | "ERROR",
    userHash: string,
    reason?: string,
): void {
    console.log(JSON.stringify({
        cqra:     true,
        policy:   POLICY_VERSION,
        surface:  surfaceId,
        decision,
        userHash,
        reason:   reason ?? null,
        ts:       new Date().toISOString(),
    }));
}

/**
 * Verify the caller holds a valid Supabase session before a durable effect executes.
 *
 * Pattern mirrors /api/auth/facebook-connect/route.ts — the only existing
 * server-side auth verification pattern in this codebase:
 *   request-scoped createClient → forwarded Authorization header → getUser().
 *
 * Returns PERMIT with verified userId, or DENY/ERROR before any effect runs.
 */
export async function cqraRequireAuth(
    req: Request,
    surfaceId: string,
): Promise<CqraResult> {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
        cqraAuditLog(surfaceId, "DENY", "anonymous", "missing_bearer");
        return { ok: false, status: 401, error: "Authentication required" };
    }

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const client = createClient(url, anon, {
        global: { headers: { Authorization: authHeader } },
        auth:   { autoRefreshToken: false, persistSession: false },
    });

    try {
        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) {
            cqraAuditLog(surfaceId, "DENY", "unknown", error?.message ?? "no_user");
            return { ok: false, status: 401, error: "Invalid or expired session" };
        }

        const userHash = hashId(user.id);
        cqraAuditLog(surfaceId, "PERMIT", userHash);
        return { ok: true, userId: user.id, userHash };

    } catch (err: any) {
        cqraAuditLog(surfaceId, "ERROR", "unknown", "gate_unavailable");
        return { ok: false, status: 503, error: "Gate unavailable" };
    }
}
