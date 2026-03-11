import Header from "@/components/Header";
import Link from "next/link";

export default function RecipePage() {
    return (
        <main>
            <Header />
            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="card">
                    <div className="flex justify-between items-center pb-5 border-b-2 border-gray-100 mb-10">
                        <h2 className="text-2xl font-bold text-harvest-green">👩‍🍳 Recipe & Tips</h2>
                        <Link href="/create" className="button-secondary text-sm px-4 py-2">
                            ← Back to Templates
                        </Link>
                    </div>

                    <div className="max-w-2xl mx-auto text-center py-16">
                        <div className="text-8xl mb-6">👩‍🍳</div>
                        <h3 className="text-3xl font-bold mb-4 text-gray-800">Coming Soon</h3>
                        <div className="inline-block bg-harvest-light border border-harvest-green/30 text-harvest-green text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
                            In Development
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed mb-10">
                            The Recipe & Tips template bridges the gap between farm and kitchen — let customers know what to do with your produce by sharing simple recipes, storage tips, and seasonal cooking ideas that make your products irresistible and drive repeat purchases.
                        </p>
                        <div className="bg-harvest-light border-l-4 border-harvest-green p-6 rounded-r-lg text-left mb-10">
                            <h4 className="font-bold text-harvest-green mb-2">🌱 What to expect</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Produce-to-recipe pairing suggestions</li>
                                <li>• Short-form and step-by-step caption formats</li>
                                <li>• Seasonal tip calendars aligned with your harvest</li>
                            </ul>
                        </div>
                        <Link href="/create" className="button-primary inline-flex items-center gap-2 px-8 py-4 text-lg">
                            ← Choose Another Template
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
