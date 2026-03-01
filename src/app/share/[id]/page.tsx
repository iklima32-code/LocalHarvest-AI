import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';

interface Props {
    params: { id: string };
}

// This is the magic part that Facebook reads
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { data: post } = await supabase
        .from('posts')
        .select('*, profiles(farm_name)')
        .eq('id', params.id)
        .single();

    if (!post) {
        return { title: 'LocalHarvest AI' };
    }

    const farmName = (post.profiles as any)?.farm_name || 'A local farm';
    const imageUrl = post.metadata?.imageUrl || '';

    return {
        title: `Fresh Harvest from ${farmName}!`,
        description: post.content.substring(0, 160) + '...',
        openGraph: {
            title: `Fresh Harvest from ${farmName}!`,
            description: post.content,
            images: imageUrl ? [imageUrl] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Fresh Harvest from ${farmName}!`,
            description: post.content,
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

export default async function SharePage({ params }: Props) {
    const { data: post } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('id', params.id)
        .single();

    if (!post) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Post Not Found</h1>
                    <p className="text-gray-600 mb-8">This harvest update might have been moved or deleted.</p>
                    <Link href="/" className="button-primary">Return Home</Link>
                </div>
            </main>
        );
    }

    const profile = post.profiles as any;

    return (
        <main className="min-h-screen bg-[#f8faf8] pb-20">
            <Header />

            <div className="max-w-[800px] mx-auto py-10 px-5">
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                    {/* Farm Header */}
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-[#006633] border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                                {profile?.farm_logo_url ? (
                                    <img src={profile.farm_logo_url} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-bold text-2xl">🌱</span>
                                )}
                            </div>
                            <div>
                                <h1 className="font-black text-xl text-gray-900 leading-tight">{profile?.farm_name || "Local Farmer"}</h1>
                                <p className="text-harvest-green font-bold text-xs uppercase tracking-widest mt-1">✨ Verified Producer</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 space-y-8">
                        {post.metadata?.imageUrl && (
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-100 border border-gray-100 aspect-square">
                                <img src={post.metadata.imageUrl} alt="Harvest" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="space-y-6">
                            <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                {post.content}
                            </p>

                            {post.hashtags && (
                                <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-50">
                                    {post.hashtags.split(' ').map((tag: string) => (
                                        <span key={tag} className="text-[#006633] font-bold text-sm bg-green-50 px-3 py-1 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-gray-500 text-sm font-bold mb-4">Want to support local farms like this one?</p>
                        <Link href="/" className="inline-flex items-center gap-2 bg-[#006633] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-900/10 hover:brightness-110 transition-all">
                            🚀 Join LocalHarvest AI
                        </Link>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-xs mt-8 font-medium italic">
                    Powered by LocalHarvest AI • Supporting sustainable agriculture
                </p>
            </div>
        </main>
    );
}
