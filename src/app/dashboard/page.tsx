"use client";

import Header from "@/components/Header";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { postService, DashboardStats } from "@/lib/posts";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    draft:     'bg-gray-200 text-gray-500',
};

export default function Dashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-harvest-green/20 border-t-harvest-green rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Preparing dashboard...</p>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isNewUser = searchParams.get('new') === 'true';

    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<DashboardStats>({ draft: 0, scheduled: 0, published: 0, total: 0 });
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
    const [postsPerDay, setPostsPerDay] = useState<{ day: string; label: string; count: number }[]>([]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('onboarding_completed, farm_name, fb_page_id, linkedin_person_urn, farm_logo_url, fb_page_name, full_name')
                .eq('id', user.id)
                .single();

            if (profileData && !profileData.onboarding_completed) {
                if (isNewUser) {
                    setLoading(false);
                    setTimeout(() => router.push("/onboarding"), 3000);
                } else {
                    router.push("/onboarding");
                }
                return;
            }

            setProfile(profileData);
            setLoading(false);

            // Fetch all dashboard data in parallel after auth confirmed
            try {
                const [statsData, recent, scheduled, perDay] = await Promise.all([
                    postService.getDashboardStats(user.id),
                    postService.getRecentPosts(user.id, 5),
                    postService.getScheduledPosts(user.id, 3),
                    postService.getPostsPerDay(user.id, 7),
                ]);
                setStats(statsData);
                setRecentPosts(recent);
                setScheduledPosts(scheduled);
                setPostsPerDay(perDay);
            } catch (err) {
                console.error('Dashboard data fetch error:', err);
            } finally {
                setDataLoading(false);
            }
        };

        init();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-harvest-green/20 border-t-harvest-green rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Loading your harvest...</p>
                </div>
            </div>
        );
    }

    const maxDayCount = Math.max(...postsPerDay.map(d => d.count), 1);
    const farmName = profile?.farm_name || 'Your Farm';
    const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : (profile?.farm_name || "");
    const isFbConnected = !!profile?.fb_page_id;
    const isLinkedInConnected = !!profile?.linkedin_person_urn;

    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">

                {/* Post Activity Stats Row */}
                <div className="card mb-8">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xl font-bold text-gray-800">📊 Post Activity</h3>
                        <Link
                            href="/create"
                            className="button-primary button-sparkle text-sm px-4 py-2"
                        >
                            ✨ Create New Post
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-5 bg-harvest-light rounded-lg">
                            <div className="text-4xl font-bold text-harvest-green mb-1">
                                {dataLoading ? <span className="text-2xl text-gray-300">…</span> : stats.total}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Total Posts</div>
                        </div>
                        <div className="text-center p-5 bg-green-50 rounded-lg">
                            <div className="text-4xl font-bold text-green-600 mb-1">
                                {dataLoading ? <span className="text-2xl text-gray-300">…</span> : stats.published}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Published</div>
                        </div>
                        <div className="text-center p-5 bg-blue-50 rounded-lg">
                            <div className="text-4xl font-bold text-blue-500 mb-1">
                                {dataLoading ? <span className="text-2xl text-gray-300">…</span> : stats.scheduled}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Scheduled</div>
                        </div>
                        <div className="text-center p-5 bg-gray-50 rounded-lg">
                            <div className="text-4xl font-bold text-gray-400 mb-1">
                                {dataLoading ? <span className="text-2xl text-gray-300">…</span> : stats.draft}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Drafts</div>
                        </div>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left / main column */}
                    <div className="col-span-1 md:col-span-2 space-y-8">

                        {/* Posts This Week bar chart */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-5 text-gray-800">📅 Posts This Week</h3>

                            {dataLoading ? (
                                <div className="space-y-4">
                                    {[...Array(7)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="w-10 text-xs text-gray-200 bg-gray-100 rounded h-3 inline-block"></span>
                                            <div className="flex-1 bg-gray-100 h-2 rounded-full animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : postsPerDay.every(d => d.count === 0) ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-4xl mb-3">📝</div>
                                    <p className="text-sm font-semibold">No posts this week yet.</p>
                                    <Link
                                        href="/create/harvest"
                                        className="text-harvest-green font-bold text-sm hover:underline mt-2 inline-block"
                                    >
                                        Create your first post →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {postsPerDay.map((d) => (
                                        <div key={d.day}>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-gray-700">{d.label}</span>
                                                <span className="text-sm text-gray-500 font-medium">
                                                    {d.count} {d.count === 1 ? 'post' : 'posts'}
                                                </span>
                                            </div>
                                            <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-harvest-green h-full rounded-full transition-all duration-700"
                                                    style={{ width: d.count === 0 ? '0%' : `${Math.max((d.count / maxDayCount) * 100, 4)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Posts */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">🕓 Recent Posts</h3>
                                <Link href="/recent" className="text-xs text-harvest-green font-bold hover:underline">
                                    View all →
                                </Link>
                            </div>

                            {dataLoading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse h-16"></div>
                                    ))}
                                </div>
                            ) : recentPosts.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-3xl mb-2">📭</div>
                                    <p className="text-sm font-semibold">No posts yet.</p>
                                    <Link href="/create/harvest" className="text-harvest-green font-bold text-sm hover:underline mt-1 inline-block">
                                        Create your first →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentPosts.map((post) => (
                                        <div
                                            key={post.id}
                                            className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-harvest-green/30 transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-2 gap-2">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] || 'bg-gray-200 text-gray-500'}`}>
                                                    {post.status}
                                                </span>
                                                <span className="text-[11px] text-gray-400 font-medium shrink-0">
                                                    {timeAgo(post.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                                                {post.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content Ideas — static, no data required */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">💡 Content Ideas for You</h3>
                            <div className="space-y-3">
                                {[
                                    "🌾 Share your morning harvest routine",
                                    "📚 Educational post about crop rotation",
                                    "👨‍🌾 Introduce a team member",
                                    "🌱 Sustainability practices spotlight",
                                ].map((idea, idx) => (
                                    <Link
                                        key={idx}
                                        href="/create/harvest"
                                        className="block p-4 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-harvest-light transition-colors"
                                    >
                                        {idea}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-8">

                        {/* Farm greeting */}
                        <div className="bg-gradient-to-br from-harvest-green to-green-700 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="text-sm font-black uppercase tracking-widest opacity-80 mb-2 animate-in fade-in slide-in-from-left-4 duration-700">Digital Harvest Hub</div>
                                <div className="text-4xl font-black leading-tight tracking-tight mb-1">Welcome back, {firstName}!</div>
                                <div className="text-lg font-bold opacity-70 leading-none">{farmName}</div>
                                <div className="text-xs opacity-60 mt-6 font-medium group-hover:opacity-100 transition-opacity">Ready to share something fresh today?</div>
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        </div>

                        {/* Upcoming Scheduled */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📅 Scheduled</h3>
                                <Link
                                    href="/create/harvest"
                                    className="text-xs bg-harvest-light text-harvest-green px-3 py-1 rounded font-bold hover:bg-harvest-green hover:text-white transition-colors"
                                >
                                    + New
                                </Link>
                            </div>

                            {dataLoading ? (
                                <div className="space-y-2">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="bg-gray-100 h-14 rounded-lg animate-pulse"></div>
                                    ))}
                                </div>
                            ) : scheduledPosts.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <div className="text-4xl mb-3">🗓️</div>
                                    <div className="font-semibold text-sm mb-1">No pending posts</div>
                                    <div className="text-xs">Queue some magic!</div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {scheduledPosts.map((post) => (
                                        <div key={post.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-600 font-bold mb-1">
                                                {new Date(post.scheduled_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </p>
                                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                {post.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Platform Connections */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">🔗 Connections</h3>
                            <div className="space-y-3">
                                <div className={`flex items-center justify-between p-3 rounded-lg border ${isFbConnected ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-blue-600 text-lg leading-none">f</span>
                                        <span className="text-sm font-bold text-gray-700">Facebook</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isFbConnected ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {isFbConnected ? '● Connected' : 'Not connected'}
                                    </span>
                                </div>

                                <div className={`flex items-center justify-between p-3 rounded-lg border ${isLinkedInConnected ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-blue-700 text-lg leading-none" style={{ fontFamily: 'serif' }}>in</span>
                                        <span className="text-sm font-bold text-gray-700">LinkedIn</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLinkedInConnected ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {isLinkedInConnected ? '● Connected' : 'Not connected'}
                                    </span>
                                </div>

                                {(!isFbConnected || !isLinkedInConnected) && (
                                    <Link
                                        href="/settings?tab=connections"
                                        className="block text-center text-xs text-harvest-green font-bold hover:underline pt-1"
                                    >
                                        Manage connections →
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
