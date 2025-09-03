"use client"

import { useState } from "react"
import { AccountsList } from "@/components/social/accounts/AccountsList"
import { AccountConnector } from "@/components/social/accounts/AccountConnector"
import { PublishStatus } from "@/components/social/accounts/PublishStatus"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Plus, 
  Activity,
  Settings
} from "lucide-react"

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "connect" | "status">("accounts")

  const handleAddAccount = () => {
    setActiveTab("connect")
  }

  const handleConnectionSuccess = (platform: string) => {
    console.log(`Successfully connected to ${platform}`)
    setActiveTab("accounts")
    // Could show a success toast or update the accounts list
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">계정 관리</h1>
          <p className="text-muted-foreground">
            소셜 미디어 계정을 연결하고 발행 상태를 관리하세요
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
          <Button onClick={handleAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            계정 추가
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>연결된 계정</span>
          </TabsTrigger>
          <TabsTrigger value="connect" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>계정 연결</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>발행 상태</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="accounts">
            <AccountsList onAddAccount={handleAddAccount} />
          </TabsContent>

          <TabsContent value="connect">
            <AccountConnector onConnectionSuccess={handleConnectionSuccess} />
          </TabsContent>

          <TabsContent value="status">
            <PublishStatus showRealtimeUpdates={true} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}