import Header from "@/components/Header";
import Link from "next/link";

const templates = [
    { id: "harvest", icon: "🌾", name: "Harvest Update", desc: "Share fresh produce and daily harvests" },
    { id: "behind-scenes", icon: "👨‍🌾", name: "Behind the Scenes", desc: "Show your farming process and operations" },
    { id: "educational", icon: "📚", name: "Educational", desc: "Teach about farming and produce" },
    { id: "sustainability", icon: "🌱", name: "Sustainability", desc: "Highlight eco-friendly practices" },
    { id: "recipe", icon: "👩‍🍳", name: "Recipe & Tips", desc: "Share cooking ideas and food tips" },
    { id: "event", icon: "📅", name: "Event Announcement", desc: "Promote markets, tours, and events" },
];

export default function CreateTemplate() {
    return (
        <main>
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">Choose Content Template</h2>
                        <Link href="/dashboard" className="button-secondary text-sm px-4 py-2">
                            Cancel
                        </Link>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-bold mb-3">What would you like to share today?</h3>
                            <p className="text-gray-600 text-lg">Select a template to start creating your content</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map((tmpl) => (
                                <Link
                                    key={tmpl.id}
                                    href={`/create/${tmpl.id}`}
                                    className="group block p-8 text-center border-4 border-gray-100 rounded-2xl transition-all hover:border-harvest-green hover:bg-harvest-light hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{tmpl.icon}</div>
                                    <div className="font-bold text-lg mb-2 text-gray-800">{tmpl.name}</div>
                                    <div className="text-sm text-gray-500 leading-relaxed">{tmpl.desc}</div>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-12 pt-10 border-t-2 border-gray-100">
                            <button className="button-secondary w-full justify-center text-lg py-4">
                                + Create Custom Template
                            </button>
                        </div>

                        <div className="bg-harvest-light border-l-4 border-harvest-green p-6 rounded-r-lg mt-10">
                            <h4 className="font-bold text-harvest-green mb-3">💡 Template Guide</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                <strong>Harvest Update:</strong> Perfect for daily produce posts - includes harvest details, quantities, and photos.<br /><br />
                                <strong>Other Templates:</strong> Each template provides a streamlined workflow tailored to that content type with AI-generated captions optimized for engagement.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
