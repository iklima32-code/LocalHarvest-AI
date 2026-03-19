"use client";

import Header from "@/components/Header";
import PhotoManager from "@/components/PhotoManager";
import Link from "next/link";

export default function GalleryPage() {
    return (
        <main className="min-h-screen bg-[#f8faf8]">
            <Header />

            <div className="max-w-[1200px] mx-auto py-10 px-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Farm Gallery</h1>
                        <p className="text-gray-500 font-medium">Manage your harvest photos and videos</p>
                    </div>
                    <Link href="/create" className="button-primary button-sparkle text-sm px-4 py-2">
                        ✨ Create New Post
                    </Link>
                </div>
                <PhotoManager />
            </div>
        </main>
    );
}
