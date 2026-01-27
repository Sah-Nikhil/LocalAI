// app/chat/[chatId]/page.tsx
import { AppSidebar } from "@/components/app-sidebar"
import MainChatArea from "@/components/chatArea"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { ChatProvider } from "@/hooks/useChatContext";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import UploadedFilesSidebar from "@/components/uploadSidebar"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
    const { chatId } = await params;

    return (
        <ChatProvider initialChatId={chatId}>
        <SidebarProvider
        className="h-svh"
        style={
            {
            "--sidebar-width": "23rem",
            } as React.CSSProperties
        }
        >
        <ThemeProvider>
            <AppSidebar />
            <SidebarInset className="overflow-hidden">
                <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b py-2 px-4">
                    <Link
                      href="/"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconArrowLeft size={18} />
                      <span className="text-sm">Back</span>
                    </Link>
                    <span className="text-foreground text-lg font-semibold ml-2">
                    DocChat
                    </span>
                <div className="ml-auto">
                    <ModeToggle/>
                </div>
                </header>
                <div className="flex flex-1 overflow-hidden h-full">
                    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                        <MainChatArea/>
                    </div>
                    <UploadedFilesSidebar/>
                </div>
            </SidebarInset>
        </ThemeProvider>
        </SidebarProvider>
        </ChatProvider>
    )
}
