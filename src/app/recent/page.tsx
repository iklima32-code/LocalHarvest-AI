"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { postService } from "@/lib/posts";
import PostDetailModal from "@/components/PostDetailModal";
import { useHarvest } from "@/context/HarvestContext";
import { useContent } from "@/context/ContentContext";

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
    const [filter, setFilter] = useState<'published' | 'scheduled' | 'draft'>('published');
    const { setFormData: setHarvestFormData, setPhotos: setHarvestPhotos, setVideos: setHarvestVideos } = useHarvest();
    const { setFormData: setContentFormData, setPhotos: setContentPhotos, setVideos: setContentVideos } = useContent();
    const [postToDelete, setPostToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const confirmDelete = async () => {
        if (!postToDelete) return;
        setIsDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", postToDelete.id)
                .eq("user_id", user.id);
            if (error) {
                alert('Failed to delete post');
            } else {
                setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
                setPostToDelete(null);
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    };


    const handleAction = async (post: any, action: 'clone' | 'edit' | 'delete') => {
        if (action === 'delete') {
            setPostToDelete(post);
            return;
        }

        // Reconstruct state for edit/clone
        const type = (post.template_type === 'short' || post.template_type === 'long' || !post.template_type) ? 'harvest' : post.template_type;

        if (type === 'harvest') {
            setHarvestFormData({
                produceType: post.metadata?.produceType || "",
                quantity: post.metadata?.quantity || "",
                unit: post.metadata?.unit || "lbs",
                variety: post.metadata?.variety || "",
                notes: post.content || "",
                contentLength: post.metadata?.contentLength || "short",
            });
            if (post.metadata?.imageUrl) setHarvestPhotos([post.metadata.imageUrl]);
            if (post.metadata?.videoUrl) setHarvestVideos([post.metadata.videoUrl]);
            router.push(`/create/harvest/content?mode=${action === 'clone' ? 'clone' : 'edit'}&postId=${post.id}`);
        } else {
            setContentFormData({
                contentType: post.template_type as any,
                primaryField: post.title || "",
                secondaryField: post.metadata?.secondaryField || "",
                details: post.content || "",
                contentLength: post.metadata?.contentLength || "short",
                extra1: post.metadata?.extra1 || "",
            });
            if (post.metadata?.imageUrl) setContentPhotos([post.metadata.imageUrl]);
            if (post.metadata?.videoUrl) setContentVideos([post.metadata.videoUrl]);
            router.push(`/create/content?mode=${action === 'clone' ? 'clone' : 'edit'}&postId=${post.id}`);
        }
    };

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
                    onEdit={() => handleAction(selectedPost, 'edit')}
                    onClone={() => handleAction(selectedPost, 'clone')}
                    onDelete={() => {
                        const post = selectedPost;
                        setSelectedPost(null);
                        handleAction(post, 'delete');
                    }}
                />
            )}

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-2 border-gray-100 mb-8 gap-4">
                        <h2 className="text-2xl font-bold text-harvest-green">My Posts</h2>
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                            {[
                                { id: 'published', label: 'Published' },
                                { id: 'scheduled', label: 'Scheduled' },
                                { id: 'draft', label: 'Drafts' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id as any)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === tab.id ? 'bg-white shadow-sm text-harvest-green border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <Link href="/create" className="button-primary button-sparkle text-sm px-4 py-2">
                            ✨ Create New Post
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
                    ) : posts.filter(p => p.status === filter).length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="text-5xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-500 mb-2">
                                No {filter} posts yet
                            </h3>
                            <p className="text-sm mb-6">
                                {filter === 'draft' ? "When you start a post and save it, it will appear here." : 
                                 filter === 'scheduled' ? "Any posts you schedule for future dates will appear here." :
                                 "You haven't published any posts yet."}
                            </p>
                            <Link href="/create/harvest" className="button-primary text-sm px-6 py-3">
                                Create New Post
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {posts
                                .filter(p => p.status === filter)
                                .map((post) => {
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
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    {post.status === 'draft' ? (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAction(post, 'edit'); }}
                                                            className="p-1.5 hover:bg-green-50 rounded-lg text-harvest-green transition-colors flex items-center gap-1 group/btn"
                                                            title="Post Draft"
                                                        >
                                                            <span className="text-sm">🚀</span>
                                                            <span className="text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity">Post</span>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAction(post, 'clone'); }}
                                                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors flex items-center gap-1 group/btn"
                                                            title="Clone Post"
                                                        >
                                                            <span className="text-sm">📋</span>
                                                            <span className="text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity">Clone</span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAction(post, 'delete'); }}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors flex items-center gap-1 group/btn"
                                                        title="Delete Post"
                                                    >
                                                        <span className="text-sm">🗑️</span>
                                                        <span className="text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity">Delete</span>
                                                    </button>
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium shrink-0">
                                                    {timeAgo(post.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 2: thumbnail + content */}
                                        <div className="flex gap-4">
                                        {(post.metadata?.imageUrl || post.metadata?.videoUrl) && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-100 relative group-hover:shadow-md transition-all">
                                                {post.metadata.imageUrl ? (
                                                    <img
                                                        src={post.metadata.imageUrl}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <>
                                                        <video
                                                        src={post.metadata.videoUrl || undefined}
                                                            className="w-full h-full object-cover opacity-60"
                                                            muted
                                                            playsInline
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                                                            ▶️
                                                        </div>
                                                    </>
                                                )}
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

            {postToDelete && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-5 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] max-w-sm w-full p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Delete post?</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed text-sm">This action cannot be undone. Are you sure you want to delete <span className="font-bold text-gray-800">&quot;{postToDelete.title || (postToDelete.metadata?.produceType + ' Update')}&quot;</span>?</p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                            <button
                                onClick={() => setPostToDelete(null)}
                                disabled={isDeleting}
                                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
