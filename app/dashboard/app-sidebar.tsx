"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconMessageCircle,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconSparkles,
  IconBrandOpenai,
  IconBrandTwitter,
  IconCalendarEvent,
  IconActivity,
  IconEdit,
  IconBrain,
} from "@tabler/icons-react"

import { NavDocuments } from "@/app/dashboard/nav-documents"
import { NavMain } from "@/app/dashboard/nav-main"
import { NavSecondary } from "@/app/dashboard/nav-secondary"
import { NavUser } from "@/app/dashboard/nav-user"
import { CreditBalance } from "@/components/social/common/CreditBalance"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChatMaxingIconColoured } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "소셜 미디어",
      url: "/dashboard/social",
      icon: IconBrandTwitter,
      items: [
        {
          title: "대시보드",
          url: "/dashboard/social",
        },
        {
          title: "게시물 작성",
          url: "/dashboard/social/compose",
          icon: IconEdit,
        },
        {
          title: "페르소나 관리",
          url: "/dashboard/social/personas", 
          icon: IconBrain,
        },
        {
          title: "스케줄 관리",
          url: "/dashboard/social/schedule",
          icon: IconCalendarEvent,
        },
        {
          title: "계정 관리",
          url: "/dashboard/social/accounts",
          icon: IconActivity,
        },
        {
          title: "분석",
          url: "/dashboard/social/analytics",
          icon: IconChartBar,
        },
      ],
    },
    {
      title: "Payment gated",
      url: "/dashboard/payment-gated",
      icon: IconSparkles,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <ChatMaxingIconColoured className="!size-6" />
                <span className="text-base font-semibold">Starter DIY</span>
                <Badge variant="outline" className="text-muted-foreground  text-xs">Demo</Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <div className="px-2 py-2">
          <CreditBalance variant="widget" />
        </div>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
