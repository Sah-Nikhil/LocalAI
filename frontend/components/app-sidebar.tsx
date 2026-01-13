"use client"

import * as React from "react"
import { ArchiveX, Command, File, Inbox, PlusCircleIcon, Send, Trash2 } from "lucide-react"
import { deleteChatSession } from "@/hooks/useChat"
import { useChatContext } from "@/hooks/useChatContext";

import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

// This is sample data
const data = {
//   user: {
//     name: "shadcn",
//     email: "m@example.com",
//     avatar: "/avatars/shadcn.jpg",
//   },
  navMain: [
    {
      title: "Current Chat",
      url: "/",
      icon: File,
      isActive: false,
    },
    {
      title: "Delete Session",
      url: "#",
      icon: Trash2,
      isActive: false,
    },
    // {
    //   title: "Inbox",
    //   url: "#",
    //   icon: Inbox,
    //   isActive: true,
    // },
    // {
    //   title: "Sent",
    //   url: "#",
    //   icon: Send,
    //   isActive: false,
    // },
    // {
    //   title: "Junk",
    //   url: "#",
    //   icon: ArchiveX,
    //   isActive: false,
    // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { resetSession } = useChatContext();
  // Note: I'm using state to show active item.
  // IRL you should use the url/router.
    const [activeItem, setActiveItem] = React.useState(data.navMain[0])
    // const [mails, setMails] = React.useState(data.mails)
    const { setOpen } = useSidebar()
    // Hybrid approach: use chatId from localStorage, but also fetch from backend for sync
    const [chatId, setChatId] = React.useState<string>("");
    React.useEffect(() => {
      // 1. Use localStorage for instant UI
      const storedChatId = localStorage.getItem("chatId");
      if (storedChatId) setChatId(storedChatId);

      // 2. Fetch latest chatId from backend for sync
      const fetchChatId = async () => {
        try {
          const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          const res = await fetch(`${backendUrl}/session/chat-session`, {
            method: "POST",
            body: JSON.stringify({ user_id: USER_ID }),
            headers: { "Content-Type": "application/json" },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.chat_id && data.chat_id !== storedChatId) {
              setChatId(data.chat_id);
              localStorage.setItem("chatId", data.chat_id);
            }
          }
        } catch (err) {
          // Optionally handle error
        }
      };
      fetchChatId();
    }, []);

    return (
        <Sidebar
        collapsible="icon"
        className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
        {...props}
        >
        {/* This is the first sidebar */}
        {/* We disable collapsible and adjust width to icon. */}
        {/* This will make the sidebar appear as icons. */}
        <Sidebar
            collapsible="none"
            className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
        >
            <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                    <a href="#">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">KA3R0X</span>
                        <span className="truncate text-xs">Enterprise</span>
                    </div>
                    </a>
                </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu>
                    {data.navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                        tooltip={{
                            children: item.title,
                            hidden: false,
                        }}
                        isActive={activeItem?.title === item.title}
                        className="px-2.5 md:px-2"
                        onClick={async () => {
                          setActiveItem(item);
                          if (item.title === "Delete Session" && chatId) {
                            try {
                              await deleteChatSession(chatId);
                              localStorage.removeItem("chatId");
                              setChatId("");
                              resetSession(); // clear context state

                              // Immediately create a new session
                              const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "fallback_u";
                              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
                              const res = await fetch(`${backendUrl}/session/chat-session`, {
                                method: "POST",
                                body: JSON.stringify({ user_id: USER_ID }),
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setChatId(data.chat_id);
                                localStorage.setItem("chatId", data.chat_id);
                                alert("Session deleted. New session started.");
                              } else {
                                alert("Session deleted. Failed to create new session.");
                              }
                            } catch (err) {
                              alert("Failed to delete session.");
                            }
                          }
                        }}
                        >
                        <item.icon className="hover:cursor-pointer"/>
                        <span>{item.title}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
            {/* <NavUser user={data.user} /> */}
            </SidebarFooter>
        </Sidebar>

        {/* This is the second sidebar */}
        {/* We disable collapsible and let it fill remaining space */}
        {/* <Sidebar collapsible="none" className="hidden flex-1 md:flex">
            <SidebarHeader className="gap-3.5 border-b p-4">
            <div className="flex w-full items-center justify-between">
                <div className="text-foreground text-base font-medium">
                {activeItem?.title}
                </div> */}
                {/* <Label className="flex items-center gap-2 text-sm">
                <span>Unreads</span>
                <Switch className="shadow-none" />
                </Label> */}
            {/* </div>
            <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
                    tooltip="Quick Create"
                    className="w-40 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                >
                    <PlusCircleIcon />
                    <span>Add New</span>
            </SidebarMenuButton>
            <SidebarInput placeholder="Type to search..." />
            </SidebarMenuItem>
            </SidebarHeader>
            <SidebarContent>
            <SidebarGroup className="px-0">
                <SidebarGroupContent>
                {mails.map((mail) => (
                    <a
                    href="#"
                    key={mail.email}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                    >
                    <div className="flex w-full items-center gap-2">
                        <span>{mail.name}</span>{" "}
                        <span className="ml-auto text-xs">{mail.date}</span>
                    </div>
                    <span className="font-medium">{mail.subject}</span>
                    <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                        {mail.teaser}
                    </span>
                    </a>
                ))}
                </SidebarGroupContent>
            </SidebarGroup>
            </SidebarContent>
        </Sidebar> */}
        </Sidebar>
    )
}
