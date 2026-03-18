"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface HarvestData {
    produceType: string;
    quantity: string;
    unit: string;
    variety: string;
    notes: string;
    contentLength: string;
}

interface HarvestContextType {
    formData: HarvestData;
    setFormData: (data: HarvestData) => void;
    photos: string[];
    setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
    videos: string[];
    setVideos: React.Dispatch<React.SetStateAction<string[]>>;
    clearHarvest: () => void;
}

const initialData: HarvestData = {
    produceType: "",
    quantity: "",
    unit: "lbs",
    variety: "",
    notes: "",
    contentLength: "short",
};

const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

export function HarvestProvider({ children }: { children: ReactNode }) {
    const [formData, setFormData] = useState<HarvestData>(initialData);
    const [photos, setPhotos] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);

    const clearHarvest = () => {
        setFormData(initialData);
        setPhotos([]);
        setVideos([]);
    };

    return (
        <HarvestContext.Provider value={{ formData, setFormData, photos, setPhotos, videos, setVideos, clearHarvest }}>
            {children}
        </HarvestContext.Provider>
    );
}

export function useHarvest() {
    const context = useContext(HarvestContext);
    if (context === undefined) {
        throw new Error("useHarvest must be used within a HarvestProvider");
    }
    return context;
}
