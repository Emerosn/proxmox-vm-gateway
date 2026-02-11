import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

export function Layout() {
  return (
    <div className="flex min-h-screen dark">
      <AppSidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
