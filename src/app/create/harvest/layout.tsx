import { HarvestProvider } from "@/context/HarvestContext";
import NavigationGuard from "@/components/NavigationGuard";

export default function HarvestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <HarvestProvider>
            <NavigationGuard />
            {children}
        </HarvestProvider>
    );
}
