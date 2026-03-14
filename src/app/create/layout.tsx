import { ContentProvider } from "@/context/ContentContext";

export default function CreateLayout({ children }: { children: React.ReactNode }) {
    return (
        <ContentProvider>
            {children}
        </ContentProvider>
    );
}
