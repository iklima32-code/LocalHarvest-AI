import Header from "@/components/Header";

export default function Dashboard() {
    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                {/* Performance Graph Section */}
                <div className="card mb-8">
                    <h3 className="text-xl font-bold mb-5 text-gray-800">📈 This Week&apos;s Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-5">
                            {[
                                { day: "Monday", engagements: 847, width: "85%", color: "bg-harvest-green" },
                                { day: "Tuesday", engagements: 923, width: "92%", color: "bg-cyan-500" },
                                { day: "Wednesday", engagements: 1056, width: "100%", color: "bg-green-500" },
                                { day: "Thursday", engagements: 789, width: "78%", color: "bg-yellow-500" },
                                { day: "Friday", engagements: 654, width: "65%", color: "bg-red-500" },
                            ].map((stat) => (
                                <div key={stat.day}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-semibold">{stat.day}</span>
                                        <span className="text-sm text-gray-600 font-medium">{stat.engagements} engagements</span>
                                    </div>
                                    <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div className={`${stat.color} h-full transition-all duration-1000`} style={{ width: stat.width }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-harvest-light border-l-4 border-harvest-green p-5 rounded-r-lg">
                            <h4 className="font-bold text-harvest-green mb-3">📊 Weekly Insights</h4>
                            <ul className="text-sm text-gray-700 space-y-3 list-disc pl-5 leading-loose">
                                <li><strong>Best day:</strong> Wednesday with 1,056 engagements</li>
                                <li><strong>Total reach:</strong> 4,269 people this week</li>
                                <li><strong>Engagement rate:</strong> 8.7% (↑ 1.2%)</li>
                                <li><strong>Most popular:</strong> Harvest update posts</li>
                                <li><strong>Peak time:</strong> 9:00 AM - 10:00 AM</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="card mb-8">
                    <h3 className="text-xl font-bold mb-5 text-gray-800">📊 Quick Stats (Last 30 Days)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="text-center p-5 bg-harvest-light rounded-lg">
                            <div className="text-4xl font-bold text-harvest-green mb-1">24</div>
                            <div className="text-sm text-gray-600 font-medium">Total Posts</div>
                            <div className="text-xs text-green-600 mt-2 font-bold">↑ 20% vs last month</div>
                        </div>
                        <div className="text-center p-5 bg-blue-50 rounded-lg">
                            <div className="text-4xl font-bold text-blue-600 mb-1">12.4K</div>
                            <div className="text-sm text-gray-600 font-medium">Total Reach</div>
                            <div className="text-xs text-green-600 mt-2 font-bold">↑ 35% vs last month</div>
                        </div>
                        <div className="text-center p-5 bg-amber-50 rounded-lg">
                            <div className="text-4xl font-bold text-amber-500 mb-1">8.2%</div>
                            <div className="text-sm text-gray-600 font-medium">Engagement Rate</div>
                            <div className="text-xs text-green-600 mt-2 font-bold">↑ 12% vs last month</div>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="col-span-1 md:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-harvest-green to-green-700 text-white p-8 rounded-xl shadow-lg">
                                <div className="text-sm opacity-90 mb-2">Good morning,</div>
                                <div className="text-3xl font-bold mb-1">Your Farm</div>
                                <div className="text-xs opacity-80">Ready to create amazing content?</div>
                            </div>
                            <div className="bg-gradient-to-br from-harvest-green to-green-700 text-white p-8 rounded-xl shadow-lg">
                                <div className="text-sm opacity-90 mb-2">Posts Created</div>
                                <div className="text-4xl font-bold mb-1">24</div>
                                <div className="text-xs opacity-80">This month</div>
                            </div>
                        </div>

                        {/* Content Suggestions */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">💡 Content Ideas for You</h3>
                            <div className="space-y-3">
                                {[
                                    "🌾 Share your morning harvest routine",
                                    "📚 Educational post about crop rotation",
                                    "👨‍🌾 Introduce a team member",
                                    "🌱 Sustainability practices spotlight",
                                ].map((idea, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-harvest-light transition-colors cursor-pointer">
                                        {idea}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Scheduled Posts */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📅 Scheduled</h3>
                                <button className="text-xs bg-harvest-light text-harvest-green px-3 py-1 rounded font-bold hover:bg-harvest-green hover:text-white transition-colors">
                                    + New
                                </button>
                            </div>
                            <div className="text-center py-10 text-gray-400">
                                <div className="text-4xl mb-3">🗓️</div>
                                <div className="font-semibold text-sm mb-1">No pending posts</div>
                                <div className="text-xs">Queue some magic!</div>
                            </div>
                        </div>

                        {/* Optimal Time */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-4 text-gray-800">⏰ Best Time Today</h3>
                            <div className="text-center p-6 bg-gradient-to-br from-harvest-green to-green-800 text-white rounded-lg">
                                <div className="text-sm opacity-80 mb-2">Optimal window</div>
                                <div className="text-4xl font-bold">9:00 AM</div>
                                <div className="text-xs opacity-80 mt-2">Reach potential: ~1,200</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
