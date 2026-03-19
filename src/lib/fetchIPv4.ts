/**
 * IPv4-forced fetch helper for use in Next.js API routes.
 * Needed because Node.js/undici tries IPv6 first, which fails in WSL2.
 * Uses Node.js built-in https module with family: 4 to force IPv4.
 */
import https from "node:https";
import http from "node:http";

interface FetchIPv4Options {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer | ArrayBuffer;
}

interface FetchIPv4Response {
    ok: boolean;
    status: number;
    headers: Record<string, string | string[] | undefined>;
    json: () => Promise<any>;
    text: () => Promise<string>;
    arrayBuffer: () => Promise<ArrayBuffer>;
}

export function fetchIPv4(url: string, options: FetchIPv4Options = {}): Promise<FetchIPv4Response> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:";
        const transport = isHttps ? https : http;

        const bodyBuffer = options.body
            ? options.body instanceof ArrayBuffer
                ? Buffer.from(options.body)
                : Buffer.from(options.body as string | Buffer)
            : undefined;

        const reqOptions: https.RequestOptions = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: options.method || "GET",
            headers: {
                ...options.headers,
                ...(bodyBuffer ? { "Content-Length": String(bodyBuffer.length) } : {}),
            },
            family: 4, // Force IPv4 — fixes AggregateError in WSL2
        };

        const req = transport.request(reqOptions, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                const raw = Buffer.concat(chunks);
                const status = res.statusCode ?? 0;
                const headers = res.headers as Record<string, string | string[] | undefined>;

                resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    headers,
                    json: () => Promise.resolve(JSON.parse(raw.toString("utf8"))),
                    text: () => Promise.resolve(raw.toString("utf8")),
                    arrayBuffer: () => Promise.resolve(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer),
                });
            });
        });

        req.on("error", reject);

        if (bodyBuffer) req.write(bodyBuffer);
        req.end();
    });
}
