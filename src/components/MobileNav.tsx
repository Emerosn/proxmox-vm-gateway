import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Download, Upload, ScrollText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/export", icon: Upload, label: "Exportar" },
  { to: "/import", icon: Download, label: "Importar" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
  { to: "/settings", icon: Settings, label: "Config" },
];

export function MobileNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 text-xs py-1 px-2",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
