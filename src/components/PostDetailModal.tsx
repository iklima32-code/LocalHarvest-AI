"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/lib/posts";

const STATUS_STYLES: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    scheduled:  "bg-blue-100 text-blue-700",
    draft:      "bg-gray-200 text-gray-600",
};

const PLATFORM_LABELS: Record<string, string> = {
    linkedin:          "LinkedIn",
    facebook:          "Facebook Page",
    personal:          "Facebook Personal",
    instagram:         "Instagram",
    facebook_personal: "Facebook Personal",
    facebook_business: "Facebook Page",
    none:              "",
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        year:    "numeric",
        month:   "short",
        day:     "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
    });
}

interface Props {
    post: Post & { id: string; created_at: string };
    onClose: () => void;
    onDelete?: () => Promise<void>;
}

export default function PostDetailModal({ post, onClose, onDelete }: Props) {
    const router = useRouter();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleDeleteConfirm = async () => {
        if (!onDelete) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await onDelete();
        } catch (err: unknown) {
            setDeleteError(err instanceof Error ? err.message : "Delete failed. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const platformLabel =
        PLATFORM_LABELS[post.metadata?.platform ?? ""] ?? post.metadata?.platform ?? "";

    const handleEdit = () => {
        onClose();
        router.push(`/create/harvest/content?mode=edit&postId=${post.id}`);
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={onClose}
        >
            {/* Panel — stop propagation so clicks inside don't close */}
            <div
                className="card w-full max-w-xl max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close X */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
                    aria-label="Close"
                >
                    ×
                </button>

                {/* Image */}
                {post.metadata?.imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-5 border border-gray-100">
                        <img
                            src={post.metadata.imageUrl}
                            alt={post.title}
                            className="w-full max-h-72 object-cover"
                        />
                    </div>
                )}

                {/* Title */}
                {post.title && (
                    <h2 className="text-xl font-bold text-harvest-green mb-3 leading-snug pr-6">
                        {post.title}
                    </h2>
                )}

                {/* Meta row: status + platform + timestamp */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span
                        className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wide ${STATUS_STYLES[post.status] ?? "bg-gray-200 text-gray-600"}`}
                    >
                        {post.status}
                    </span>
                    {platformLabel && (
                        <span className="text-[11px] text-gray-400 font-medium">
                            via {platformLabel}
                        </span>
                    )}
                    <span className="text-[11px] text-gray-400 ml-auto">
                        {formatDate(post.created_at)}
                    </span>
                </div>

                {/* Caption */}
                {post.content && (
                    <div className="mb-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            Caption
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                            {post.content}
                        </p>
                    </div>
                )}

                {/* Hashtags */}
                {post.hashtags && (
                    <div className="mb-5">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                            Hashtags
                        </p>
                        <p className="text-harvest-green text-sm font-medium">
                            {post.hashtags}
                        </p>
                    </div>
                )}

                {/* Scheduled date */}
                {post.status === "scheduled" && post.scheduled_at && (
                    <div className="mb-5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold">
                        Scheduled for {formatDate(post.scheduled_at)}
                    </div>
                )}

                {/* Action buttons */}
                {confirmDelete ? (
                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm text-red-600 font-semibold mb-3">
                            Delete this post? This cannot be undone.
                        </p>
                        {deleteError && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                                {deleteError}
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
                            >
                                {deleting ? "Deleting…" : "Yes, Delete"}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                                className="button-secondary text-sm px-5 py-2.5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button onClick={handleEdit} className="button-primary text-sm px-5 py-2.5">
                            Edit Post
                        </button>
                        {onDelete && (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="text-sm font-semibold px-5 py-2.5 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                                Delete Post
                            </button>
                        )}
                        <button onClick={onClose} className="button-secondary text-sm px-5 py-2.5 ml-auto">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
