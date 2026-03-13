/**
 * Phase A content-policy hard-block — shared checker
 * policy: phase-a-v1
 *
 * Zero external dependencies — safe to import in both server-side API routes
 * and client-side modules.
 *
 * Scope: explicit denylist for clearly disallowed profanity and hate-slur
 * class content only. Not a scoring engine. Not a broad safety claim.
 * Fail-closed: disallowed content → ContentPolicyError thrown, no effect runs.
 */

/** Common leet-speak substitutions normalised before matching. */
const LEET: Readonly<Record<string, string>> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '!': 'i', '$': 's',
};

function normalizeLeet(text: string): string {
    return text.toLowerCase().replace(/[01345@!$]/g, c => LEET[c] ?? c);
}

/**
 * Explicitly disallowed terms — profanity and hate-slur class.
 * Word-boundary matched to prevent substring false-positives.
 * Does NOT claim comprehensive moderation coverage.
 */
const DISALLOWED_TERMS: readonly string[] = [
    'fuck', 'fucker', 'fuckers', 'fucking', 'fucked',
    'shit', 'shits', 'shitting',
    'bitch', 'bitches',
    'asshole', 'assholes',
    'cunt', 'cunts',
    'nigga', 'nigger', 'niggers',
];

function wordBoundaryMatch(normalized: string, term: string): boolean {
    let start = 0;
    while (start <= normalized.length - term.length) {
        const idx = normalized.indexOf(term, start);
        if (idx === -1) return false;
        const before = idx > 0 ? normalized[idx - 1] : ' ';
        const after = idx + term.length < normalized.length ? normalized[idx + term.length] : ' ';
        if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true;
        start = idx + 1;
    }
    return false;
}

/**
 * Returns true if text contains clearly disallowed content.
 * Applies leet normalisation and word-boundary guard.
 */
export function containsDisallowedContent(text: string): boolean {
    if (!text) return false;
    const normalized = normalizeLeet(text);
    return DISALLOWED_TERMS.some(term => wordBoundaryMatch(normalized, term));
}

/** Thrown when a field fails the Phase A content-policy check. */
export class ContentPolicyError extends Error {
    readonly field: string;
    constructor(field: string) {
        super(`Content policy violation in field: ${field}`);
        this.name = 'ContentPolicyError';
        this.field = field;
    }
}

/**
 * Throws ContentPolicyError on the first field that contains disallowed content.
 * Call before any durable effect (DB write, model invocation) to enforce fail-closed.
 */
export function assertContentPolicy(fields: {
    title: string;
    content: string;
    hashtags: string;
}): void {
    for (const [field, value] of Object.entries(fields) as [string, string][]) {
        if (containsDisallowedContent(value)) {
            throw new ContentPolicyError(field);
        }
    }
}
