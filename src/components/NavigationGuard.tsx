"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationGuardProps {
    onSaveDraft?: () => Promise<void>;
    showSaveOption?: boolean;
}

export default function NavigationGuard({ onSaveDraft, showSaveOption = false }: NavigationGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);

    // List of paths that are part of the content creation workflow
    const workflowPaths = [
        "/create/harvest",
        "/create/harvest/content",
    ];

    const isWorkflowPath = (path: string) => workflowPaths.some(p => path === p || path.startsWith(p + "/"));

    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            let target = e.target as HTMLElement;
            let anchor = target.closest("a");

            if (anchor && anchor.href && isWorkflowPath(pathname)) {
                // If it's a relative link (starts with /) or same origin
                const url = new URL(anchor.href, window.location.origin);
                const isSameOrigin = url.origin === window.location.origin;
                const targetPathname = url.pathname;

                if (isSameOrigin && !isWorkflowPath(targetPathname)) {
                    // It's a client-side navigation away from workflow
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingUrl(anchor.href);
                    setShowWarning(true);
                }
            }
        };

        const handlePopState = (e: PopStateEvent) => {
            if (isWorkflowPath(pathname)) {
                // Helps with back button. Not perfect but effective as a deterrent
                if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
                    window.history.pushState(null, "", pathname);
                }
            }
        };

        // useCapture: true is key to intercept Next.js Link behavior before it acts
        document.addEventListener("click", handleAnchorClick, true);
        window.addEventListener("popstate", handlePopState);

        return () => {
            document.removeEventListener("click", handleAnchorClick, true);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [pathname]);

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl relative border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="text-center">
                    <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mb-8 mx-auto rotate-12">
                        <span className="text-4xl">⚠️</span>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Unsaved Content!</h3>
                    <p className="text-gray-500 mb-10 leading-relaxed font-medium">
                        If you leave now, you will lose your data. What do you want to do?
                    </p>

                    <div className="flex flex-col gap-3">
                        {showSaveOption && onSaveDraft && (
                            <button
                                onClick={async () => {
                                    await onSaveDraft();
                                    if (pendingUrl) {
                                        window.location.href = pendingUrl;
                                    }
                                    setShowWarning(false);
                                }}
                                className="w-full bg-[#006633] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-900/10 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">💾</span> Save as Draft
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (pendingUrl) {
                                    window.location.href = pendingUrl;
                                }
                                setShowWarning(false);
                            }}
                            className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl transition-all hover:bg-red-100 active:scale-95"
                        >
                            Discard Draft
                        </button>
                        <button
                            onClick={() => {
                                setShowWarning(false);
                                setPendingUrl(null);
                            }}
                            className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl transition-all hover:bg-gray-200 active:scale-95"
                        >
                            Wait, Stay Here
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
