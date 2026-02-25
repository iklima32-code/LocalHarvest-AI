import Header from "@/components/Header";
import Link from "next/link";

const posts = [
    {
        id: 1,
        time: "2 hours ago",
        status: "Published",
        title: "🍅 Fresh Heirloom Tomatoes",
        excerpt: "Just harvested 45 lbs of beautiful heirloom tomatoes! The perfect summer flavor awaits you at the market this weekend...",
        likes: 124,
        comments: 18,
        shares: 9
    },
    {
        id: 2,
        time: "Yesterday",
        status: "Published",
        title: "🥬 Behind the Scenes: Lettuce Growing",
        excerpt: "Ever wondered how we grow such crisp, fresh lettuce? Here's a peek into our greenhouse and sustainable growing practices...",
        likes: 156,
        comments: 24,
        shares: 12
    },
    {
        id: 3,
        time: "3 days ago",
        status: "Published",
        title: "🌽 Sweet Corn Season Has Arrived!",
        excerpt: "The wait is over! Our sweet corn is ready and it's absolutely delicious this year. Get it fresh at the farm stand...",
        likes: 98,
        comments: 15,
        shares: 7
    }
];

export default function RecentPosts() {
    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">Recent Posts</h2>
                        <Link href="/create" className="button-primary text-sm px-4 py-2">
                            + Create New Post
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {posts.map((post) => (
                            <div key={post.id} className="p-6 border-2 border-gray-100 rounded-xl hover:border-harvest-green transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-sm text-gray-500 font-medium">{post.time} · {post.status}</div>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        {post.status}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-harvest-green transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed mb-6">{post.excerpt}</p>

                                <div className="flex gap-6 text-sm font-bold text-gray-500 border-t border-gray-50 pt-4">
                                    <span>❤️ {post.likes} likes</span>
                                    <span>💬 {post.comments} comments</span>
                                    <span>🔄 {post.shares} shares</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 text-center">
                        <button className="text-harvest-green font-bold hover:underline">
                            Load More Posts
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
