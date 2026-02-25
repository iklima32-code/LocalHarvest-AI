"use client";

import { HarvestProvider } from "@/context/HarvestContext";

export default function HarvestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <HarvestProvider>{children}</HarvestProvider>;
}
