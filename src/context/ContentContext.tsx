"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { photoTransfer } from "@/lib/photoTransfer";

export type ContentType = "behind-scenes" | "educational" | "sustainability" | "recipe" | "event" | "";

export interface ContentFormData {
    contentType: ContentType;
    primaryField: string;
    secondaryField: string;
    details: string;
    contentLength: "short" | "long";
    extra1: string;
}

interface ContentContextType {
    formData: ContentFormData;
    setFormData: (data: ContentFormData) => void;
    photos: string[];
    setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
    videos: string[];
    setVideos: React.Dispatch<React.SetStateAction<string[]>>;
    clearContent: () => void;
}

const initialData: ContentFormData = {
    contentType: "",
    primaryField: "",
    secondaryField: "",
    details: "",
    contentLength: "short",
    extra1: "",
};

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
    const [formData, setFormData] = useState<ContentFormData>(initialData);
    const [photos, setPhotos] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);

    const clearContent = () => {
        setFormData(initialData);
        setPhotos([]);
        setVideos([]);
        photoTransfer.clear();
    };

    return (
        <ContentContext.Provider value={{ formData, setFormData, photos, setPhotos, videos, setVideos, clearContent }}>
            {children}
        </ContentContext.Provider>
    );
}

export function useContent() {
    const context = useContext(ContentContext);
    if (context === undefined) {
        throw new Error("useContent must be used within a ContentProvider");
    }
    return context;
}

export const TEMPLATE_CONFIG: Record<string, {
    icon: string;
    name: string;
    primaryLabel: string;
    primaryPlaceholder: string;
    secondaryLabel: string;
    secondaryPlaceholder: string;
    extra1Label: string | null;
    extra1Placeholder?: string;
    detailsLabel: string;
    detailsPlaceholder: string;
}> = {
    "behind-scenes": {
        icon: "👨‍🌾",
        name: "Behind the Scenes",
        primaryLabel: "What are you sharing today?",
        primaryPlaceholder: "e.g., Morning seed planting routine, irrigation day, soil prep",
        secondaryLabel: "Who is featured? (optional)",
        secondaryPlaceholder: "e.g., Maria, our head farmer",
        extra1Label: null,
        detailsLabel: "Additional context (optional)",
        detailsPlaceholder: "Any extra details about this moment or activity",
    },
    "educational": {
        icon: "📚",
        name: "Educational",
        primaryLabel: "Topic",
        primaryPlaceholder: "e.g., Why heirloom tomatoes taste better than grocery store ones",
        secondaryLabel: "Key takeaway (optional)",
        secondaryPlaceholder: "e.g., Grown slowly, no ripening agents, more nutrients",
        extra1Label: null,
        detailsLabel: "Background, facts, or interesting details",
        detailsPlaceholder: "Share any facts, history, or context that would help your audience learn",
    },
    "sustainability": {
        icon: "🌱",
        name: "Sustainability",
        primaryLabel: "Practice or initiative",
        primaryPlaceholder: "e.g., Solar-powered irrigation system, composting program",
        secondaryLabel: "Impact or result (optional)",
        secondaryPlaceholder: "e.g., Reduced water usage by 40%, diverted 500 lbs of waste",
        extra1Label: null,
        detailsLabel: "How it works and why you do it",
        detailsPlaceholder: "Explain the practice, the reasoning, or any challenges you overcame",
    },
    "recipe": {
        icon: "👩‍🍳",
        name: "Recipe & Tips",
        primaryLabel: "Dish or tip title",
        primaryPlaceholder: "e.g., Caprese Salad with Heirloom Tomatoes",
        secondaryLabel: "Main ingredient (from the farm)",
        secondaryPlaceholder: "e.g., Heirloom tomatoes, fresh basil",
        extra1Label: "Serves / Prep time (optional)",
        extra1Placeholder: "e.g., Serves 4 | Ready in 10 minutes",
        detailsLabel: "Key steps, ingredients, or tips",
        detailsPlaceholder: "Share the key steps, a few ingredients, or a cooking tip your followers will love",
    },
    "event": {
        icon: "📅",
        name: "Event Announcement",
        primaryLabel: "Event name",
        primaryPlaceholder: "e.g., Summer Farm Open Day, Harvest Festival",
        secondaryLabel: "Date & Time",
        secondaryPlaceholder: "e.g., Saturday July 15, 10am–2pm",
        extra1Label: "Location",
        extra1Placeholder: "e.g., 123 Farm Road, Springfield",
        detailsLabel: "What to expect / How to register",
        detailsPlaceholder: "What will people experience? Is there a ticket price? How do they sign up?",
    },
};
