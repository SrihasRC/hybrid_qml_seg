"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Layers,
  ScanLine,
  Cuboid,
  BarChart3,
  FlaskConical,
  BookOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  {
    group: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Models", href: "/models", icon: Box },
    ],
  },
  {
    group: "Inference",
    items: [
      { title: "Slice (2D)", href: "/inference/slice", icon: ScanLine },
      { title: "Volume (3D)", href: "/inference/volume", icon: Cuboid },
    ],
  },
  {
    group: "Analysis",
    items: [
      { title: "Comparison", href: "/comparison", icon: BarChart3 },
      {
        title: "Visualizations",
        href: "/visualizations",
        icon: FlaskConical,
      },
    ],
  },
  {
    group: "Reference",
    items: [
      { title: "Research", href: "/research", icon: BookOpen },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NeuroSeg</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Meningioma Segmentation
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild>
              <Link href="/">
                <Layers className="size-4" />
                <span className="text-muted-foreground text-xs">
                  Hybrid QML Research
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
