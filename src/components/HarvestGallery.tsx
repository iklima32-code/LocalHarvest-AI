"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Photo {
    url: string;
    fullPath?: string;
    name?: string;
    isAi?: boolean;
}

interface HarvestGalleryProps {
    onSelect?: (url: string) => void;
    selectedPhotos?: string[];
    maxSelection?: number;
    mediaType?: "photo" | "video";
}

export default function HarvestGallery({
    onSelect,
    selectedPhotos = [],
    maxSelection = 4,
    mediaType = "photo"
}: HarvestGalleryProps) {
    const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "user" | "ai">("all");
    const [unlockedPhotos, setUnlockedPhotos] = useState<Record<string, boolean>>({});
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
    const [showLockWarning, setShowLockWarning] = useState(false);
    const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const fetchGallery = async () => {
        setLoading(true);
        setSelectedForDeletion([]);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: files, error } = await supabase.storage.from('harvest-photos').list(user.id);
            if (error || !files) return;

            const sortedFiles = files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const filePaths = sortedFiles.map(file => `${user.id}/${file.name}`);

            if (filePaths.length === 0) {
                setGalleryPhotos([]);
                setLoading(false);
                return;
            }

            const { data: signedUrls, error: urlError } = await supabase.storage
                .from('harvest-photos')
                .createSignedUrls(filePaths, 3600 * 24 * 7);

            if (signedUrls && !urlError) {
                setGalleryPhotos(signedUrls.map(u => u.signedUrl));
            }
        } catch (err) {
            console.error("Gallery fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGallery();
    }, []);

    const toggleLock = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setUnlockedPhotos(prev => ({ ...prev, [url]: !prev[url] }));
    };

    const handleDeleteClick = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!unlockedPhotos[url]) {
            setShowLockWarning(true);
            return;
        }
        setPhotoToDelete(url);
    };

    const toggleSelectionForDeletion = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedForDeletion(prev =>
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    const toggleSelectAll = () => {
        if (selectedForDeletion.length === filteredPhotos.length) {
            setSelectedForDeletion([]);
        } else {
            setSelectedForDeletion(filteredPhotos);
        }
    };

    const confirmDelete = async () => {
        if (!photoToDelete) return;
        try {
            const urlObj = new URL(photoToDelete);
            const pathname = urlObj.pathname;
            const bucketPrefix = '/harvest-photos/';
            const bucketIndex = pathname.indexOf(bucketPrefix);

            if (bucketIndex !== -1) {
                const filePath = pathname.substring(bucketIndex + bucketPrefix.length);
                const { error } = await supabase.storage.from('harvest-photos').remove([filePath]);

                if (!error) {
                    setGalleryPhotos(prev => prev.filter(p => p !== photoToDelete));
                    setSelectedForDeletion(prev => prev.filter(p => p !== photoToDelete));
                    setPhotoToDelete(null);
                }
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const confirmBulkDelete = async () => {
        if (deleteConfirmText.toLowerCase() !== 'delete') return;
        setIsDeletingBulk(true);
        try {
            const filePaths = selectedForDeletion.map(url => {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                const bucketPrefix = '/harvest-photos/';
                const bucketIndex = pathname.indexOf(bucketPrefix);
                return bucketIndex !== -1 ? pathname.substring(bucketIndex + bucketPrefix.length) : null;
            }).filter(p => p !== null) as string[];

            if (filePaths.length === 0) return;

            const { error } = await supabase.storage.from('harvest-photos').remove(filePaths);

            if (!error) {
                setGalleryPhotos(prev => prev.filter(p => !selectedForDeletion.includes(p)));
                setSelectedForDeletion([]);
                setShowBulkDeleteModal(false);
                setDeleteConfirmText("");
            } else {
                alert("Some files could not be deleted.");
            }
        } catch (err) {
            console.error("Bulk delete error:", err);
        } finally {
            setIsDeletingBulk(false);
        }
    };

    const isAiPhoto = (url: string) => {
        try {
            const path = new URL(url).pathname;
            const fileName = path.split('/').pop() || "";
            return fileName.startsWith('ai-');
        } catch { return false; }
    };

    const isVideoFile = (url: string) => {
        try {
            const path = new URL(url).pathname;
            const fileName = path.split('/').pop() || "";
            return fileName.startsWith('vid-');
        } catch { return false; }
    };

    const filteredPhotos = galleryPhotos.filter(url => {
        // First separate by media type
        if (mediaType === "video") return isVideoFile(url);
        if (isVideoFile(url)) return false; // hide videos from photo gallery

        // Then apply photo-specific filters
        if (filter === "all") return true;
        const isAi = isAiPhoto(url);
        return filter === "ai" ? isAi : !isAi;
    });

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Filter & Bulk Actions Bar */}
            <div className="flex flex-col gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-wrap justify-between items-center gap-6 shadow-sm">
                    <div className="flex items-center gap-6">
                        {mediaType === "photo" && <div className="text-gray-500 font-bold text-sm uppercase tracking-wider">Filter:</div>}
                        <div className="flex gap-6">
                            {(mediaType === "photo" ? [
                                { id: "all", label: "All" },
                                { id: "user", label: "User" },
                                { id: "ai", label: "AI" }
                            ] : [
                                { id: "all", label: "My Videos" }
                            ]).map((opt) => (
                                <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${filter === opt.id ? 'border-green-600' : 'border-gray-200 group-hover:border-green-300'}`}>
                                        {filter === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>}
                                    </div>
                                    <span className={`text-sm font-bold transition-colors ${filter === opt.id ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{opt.label}</span>
                                    <input type="radio" name="galleryFilter" className="hidden" onChange={() => setFilter(opt.id as any)} checked={filter === opt.id} />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-xs font-bold text-gray-500 hover:text-green-600 transition-colors uppercase tracking-widest"
                        >
                            {selectedForDeletion.length === filteredPhotos.length && filteredPhotos.length > 0 ? "Deselect All" : "Select All"}
                        </button>
                        {selectedForDeletion.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowBulkDeleteModal(true)}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                            >
                                Delete ({selectedForDeletion.length})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-[#006633]/20 border-t-[#006633] rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {filteredPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {filteredPhotos.map((url, i) => (
                                <div key={i} className="flex flex-col gap-2 group relative">
                                    <div
                                        className={`aspect-square overflow-hidden rounded-[20px] shadow-sm cursor-pointer transition-all duration-300 hover:scale-[1.03] border-[3px] ${selectedPhotos.includes(url) ? 'border-[#006633] scale-[1.02]' : 'border-transparent hover:border-gray-100'
                                            } ${selectedForDeletion.includes(url) ? 'ring-4 ring-red-500/20 opacity-80' : ''} relative`}
                                        onClick={() => onSelect?.(url)}
                                    >
                                        {isVideoFile(url) ? (
                                            <>
                                                <video
                                                    src={url}
                                                    className="w-full h-full object-cover bg-gray-900"
                                                    muted
                                                    preload="metadata"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="bg-black/40 rounded-full w-10 h-10 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                        )}

                                        {/* Selection Indicators */}
                                        {selectedPhotos.includes(url) && (
                                            <div className="absolute inset-0 bg-[#006633]/10 flex items-center justify-center">
                                                <div className="bg-white rounded-full p-1.5 shadow-lg border border-[#006633]/20">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006633" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            </div>
                                        )}

                                        {/* Select / Delete Checkbox */}
                                        {onSelect ? (
                                            // Photo-selection mode: checkbox selects for post
                                            <div className={`absolute top-3 left-3 z-10 transition-opacity ${selectedPhotos.includes(url) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); onSelect(url); }}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${selectedPhotos.includes(url) ? 'bg-[#006633] border-[#006633] shadow-lg text-white' : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-[#006633]'}`}
                                                >
                                                    {selectedPhotos.includes(url) ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            // Gallery-management mode: checkbox selects for deletion
                                            <div className={`absolute top-3 left-3 z-10 transition-opacity ${selectedForDeletion.includes(url) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSelectionForDeletion(url, e)}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${selectedForDeletion.includes(url) ? 'bg-red-500 border-red-500 shadow-lg text-white' : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-red-400'}`}
                                                >
                                                    {selectedForDeletion.includes(url) ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-5 p-1">
                                        <button
                                            type="button"
                                            onClick={(e) => toggleLock(url, e)}
                                            className={`transition-all ${!unlockedPhotos[url] ? 'text-amber-500 scale-110' : 'text-gray-300 hover:text-gray-500'}`}
                                            title={!unlockedPhotos[url] ? "Locked (Click to unlock)" : "Unlocked (Click to lock)"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                {!unlockedPhotos[url] ? (
                                                    <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>
                                                ) : (
                                                    <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></>
                                                )}
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteClick(url, e)}
                                            className={`transition-all ${unlockedPhotos[url] ? 'text-red-500 hover:scale-110' : 'text-gray-200'}`}
                                            title={unlockedPhotos[url] ? "Delete Photo" : "Unlock to delete"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100 animate-in fade-in duration-700">
                            <div className="text-6xl mb-6">🏜️</div>
                            <h2 className="text-2xl font-black text-gray-300 mb-2 uppercase tracking-widest leading-tight">
                                {mediaType === "video" ? "No Videos Found" : "No Photos Found"}
                            </h2>
                            <p className="text-gray-400 font-medium tracking-tight">
                                {mediaType === "video"
                                    ? "Upload a video using the Upload tab."
                                    : "Try changing your filter or uploading new harvest photos."}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* MODALS */}

            {/* Single Delete Confirmation */}
            {photoToDelete && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Delete Photo?</h3>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10 tracking-tight">
                                This will remove it from your storage permanently. This action cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPhotoToDelete(null)}
                                    className="flex-1 py-4 font-black text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 font-black text-white bg-red-600 hover:bg-red-700 rounded-2xl shadow-xl shadow-red-200 transition-all uppercase tracking-widest text-xs"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Modal */}
            {showBulkDeleteModal && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Bulk Delete?</h3>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6 tracking-tight">
                                You are about to delete <span className="text-red-600 font-black">{selectedForDeletion.length} photo(s)</span>.
                                This is permanent and cannot be undone.
                            </p>

                            <div className="mb-8">
                                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3">Type &quot;delete&quot; to confirm</label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="Type here..."
                                    className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center font-black text-xl tracking-widest focus:border-red-500 outline-none transition-all placeholder:text-gray-200 uppercase"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBulkDeleteModal(false);
                                        setDeleteConfirmText("");
                                    }}
                                    disabled={isDeletingBulk}
                                    className="flex-1 py-5 font-black text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmBulkDelete}
                                    disabled={isDeletingBulk || deleteConfirmText.toLowerCase() !== 'delete'}
                                    className="flex-1 py-5 font-black text-white bg-red-600 hover:bg-red-700 rounded-2xl shadow-2xl shadow-red-200 transition-all uppercase tracking-widest text-xs disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    {isDeletingBulk ? (
                                        <>Deleting...</>
                                    ) : (
                                        <>Yes, Delete All</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showLockWarning && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-5 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100 relative">
                        <button
                            type="button"
                            onClick={() => setShowLockWarning(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <span className="text-4xl">🔒</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight text-center">Locked Photo</h3>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10 tracking-tight">
                                To prevent accidental deletion, please click the lock icon below the photo to unlock it before deleting.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowLockWarning(false)}
                                className="w-full py-5 font-black text-white bg-[#006633] hover:bg-[#004d26] rounded-2xl shadow-xl shadow-green-900/20 transition-all text-xl"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
