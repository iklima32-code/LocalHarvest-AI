"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // New users go to dashboard first, then we trigger onboarding after a delay
            router.push("/dashboard?new=true");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-start to-background-end p-5">
            <div className="bg-white p-10 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-10">
                    <div className="text-5xl mb-4">🌱</div>
                    <h1 className="text-3xl font-bold text-harvest-green mb-2">Create Your Account</h1>
                    <p className="text-gray-600">Start transforming your harvest into engaging content</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-semibold border-l-4 border-red-500">
                            ⚠️ {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-harvest-green outline-none transition-colors"
                            placeholder="John Smith"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-harvest-green outline-none transition-colors"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                        <div className="relative w-full flex items-center">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-harvest-green outline-none transition-colors pr-12 bg-transparent"
                                placeholder="At least 8 characters"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 text-sm text-gray-600">
                        <input type="checkbox" required className="w-5 h-5 mt-0.5 rounded border-gray-300 text-harvest-green focus:ring-harvest-green" />
                        <p>
                            I agree to the <Link href="#" className="text-harvest-green font-semibold hover:underline">Terms of Service</Link> and <Link href="#" className="text-harvest-green font-semibold hover:underline">Privacy Policy</Link>
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="button-primary w-full justify-center py-4 text-lg disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "✨ Create Account"}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-harvest-green font-bold hover:underline">
                        Login here
                    </Link>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/" className="button-secondary px-8 py-2 text-sm">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
