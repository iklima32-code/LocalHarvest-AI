"use client";

import Header from "@/components/Header";
import PhotoManager from "@/components/PhotoManager";

export default function GalleryPage() {
    return (
        <main className="min-h-screen bg-[#f8faf8]">
            <Header />

            <div className="max-w-[1200px] mx-auto py-12 px-5">
                <PhotoManager />
            </div>
        </main>
    );
}
