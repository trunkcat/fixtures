import { AppSidebar } from "@/components/DashboardSidebar";
import { GlobalStateProvider } from "@/components/GlobalStateProvider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useState } from "react";
import { Outlet } from "react-router";

const SIDEBAR_STATE_LOCAL_STORAGE_KEY = "sidebar-state";

export function DashboardLayout() {
    const defaultOpen = localStorage.getItem(SIDEBAR_STATE_LOCAL_STORAGE_KEY) !== "false";
    const [sidebarOpen, setSidebarOpen] = useState(defaultOpen);

    return (
        <GlobalStateProvider>
            <SidebarProvider
                defaultOpen={defaultOpen}
                open={sidebarOpen}
                onOpenChange={(open) => {
                    localStorage.setItem(SIDEBAR_STATE_LOCAL_STORAGE_KEY, open.toString());
                    setSidebarOpen(open);
                }}
            >
                <AppSidebar />
                <SidebarInset>
                    <main className="w-full">
                        <nav className="sticky top-0 z-50 flex place-items-center gap-4 border-b bg-background/50 p-3 backdrop-blur-lg">
                            <SidebarTrigger className="size-10" />
                            <h1 className="font-medium">Fixtures</h1>
                        </nav>
                        <div className="mx-auto px-8 py-8 max-w-4xl">
                            <Outlet />
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </GlobalStateProvider>
    );
}
