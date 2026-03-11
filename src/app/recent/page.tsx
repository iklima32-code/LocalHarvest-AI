"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { postService } from "@/lib/posts";
import PostDetailModal from "@/components/PostDetailModal";

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}

const STATUS_STYLES: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    draft:     'bg-gray-200 text-gray-600',
};

const PLATFORM_LABELS: Record<string, string> = {
    linkedin:         'LinkedIn',
    facebook:         'Facebook Page',
    personal:         'Facebook Personal',
    instagram:        'Instagram',
    facebook_personal:'Facebook Personal',
    facebook_business:'Facebook Page',
    none:             '',
};

export default function RecentPosts() {
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            try {
                const data = await postService.getRecentPosts(user.id, 20);
                setPosts(data);
            } catch (err) {
                console.error('Failed to fetch posts:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    return (
        <main>
            <Header />

            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    onDelete={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        const { data: deleted, error } = await supabase
                            .from("posts")
                            .delete()
                            .eq("id", selectedPost.id)
                            .eq("user_id", user.id)
                            .select("id");
                        if (error) throw error;
                        if (!deleted || deleted.length === 0) {
                            throw new Error("Delete failed: post was not removed. Check your permissions.");
                        }
                        setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
                        setSelectedPost(null);
                    }}
                />
            )}

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-8">
                        <h2 className="text-2xl font-bold text-harvest-green">Post History</h2>
                        <Link href="/create/harvest" className="button-primary text-sm px-4 py-2">
                            + Create New Post
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="p-6 border-2 border-gray-100 rounded-xl animate-pulse">
                                    <div className="h-3 bg-gray-100 rounded w-1/5 mb-3"></div>
                                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-100 rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="text-5xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-500 mb-2">No posts yet</h3>
                            <p className="text-sm mb-6">Create your first harvest post to see it here.</p>
                            <Link href="/create/harvest" className="button-primary text-sm px-6 py-3">
                                Create Your First Post
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {posts.map((post) => {
                                const platformLabel = PLATFORM_LABELS[post.metadata?.platform] ?? '';
                                return (
                                    <div
                                        key={post.id}
                                        onClick={() => setSelectedPost(post)}
                                        className="p-6 border-2 border-gray-100 rounded-xl hover:border-harvest-green/30 transition-all group cursor-pointer"
                                    >
                                        {/* Row 1: status + platform + time */}
                                        <div className="flex justify-between items-start mb-3 gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wide ${STATUS_STYLES[post.status] || 'bg-gray-200 text-gray-600'}`}>
                                                    {post.status}
                                                </span>
                                                {platformLabel && (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        via {platformLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium shrink-0">
                                                {timeAgo(post.created_at)}
                                            </span>
                                        </div>

                                        {/* Row 2: thumbnail + content */}
                                        <div className="flex gap-4">
                                            {post.metadata?.imageUrl && (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                                                    <img
                                                        src={post.metadata.imageUrl}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {post.title && (
                                                    <h3 className="font-bold text-gray-800 mb-1 group-hover:text-harvest-green transition-colors text-sm leading-snug">
                                                        {post.title}
                                                    </h3>
                                                )}
                                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                                    {post.content}
                                                </p>
                                                {post.hashtags && (
                                                    <p className="text-harvest-green text-xs font-medium mt-2 truncate">
                                                        {post.hashtags}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: scheduled date (scheduled posts only) */}
                                        {post.status === 'scheduled' && post.scheduled_at && (
                                            <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-blue-600 font-bold">
                                                📅 Scheduled for{' '}
                                                {new Date(post.scheduled_at).toLocaleDateString('en-US', {
                                                    weekday: 'short', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
