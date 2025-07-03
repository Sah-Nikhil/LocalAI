import { AppSidebar } from "@/components/app-sidebar"
import MainChatArea from "@/components/chatArea"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import UploadedFilesSidebar from "@/components/uploadSidebar"
import { Main } from "next/document"

export default function Page() {
    return (
        <SidebarProvider
        style={
            {
            "--sidebar-width": "23rem",
            } as React.CSSProperties
        }
        >
        <ThemeProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2  border-b p-4">
                {/* <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                /> */}
                <Breadcrumb>
                    <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Inbox</BreadcrumbPage>
                    </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto">
                    <ModeToggle/>
                </div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <MainChatArea/>
                    </div>
                    <UploadedFilesSidebar/>
                </div>
            </SidebarInset>
        </ThemeProvider>
        </SidebarProvider>
    )
}
