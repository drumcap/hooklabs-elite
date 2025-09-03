"use client"

import React, { useState, memo, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Edit, 
  MoreVertical, 
  Trash2, 
  User, 
  MessageCircle,
  TrendingUp,
  Settings
} from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface PersonaCardProps {
  persona: {
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
    description?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  postCount?: number
  onEdit: (persona: PersonaCardProps["persona"]) => void
  onDelete: (personaId: Id<"personas">) => void
  onToggleActive: (personaId: Id<"personas">) => void
}

export const PersonaCard = memo(function PersonaCard({
  persona,
  postCount = 0,
  onEdit,
  onDelete,
  onToggleActive
}: PersonaCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  // 메모이제이션된 핸들러들
  const handleToggleActive = useCallback(async () => {
    setIsToggling(true)
    try {
      await onToggleActive(persona._id)
    } finally {
      setIsToggling(false)
    }
  }, [onToggleActive, persona._id])

  const handleEdit = useCallback(() => {
    onEdit(persona)
  }, [onEdit, persona])

  const handleDelete = useCallback(() => {
    onDelete(persona._id)
  }, [onDelete, persona._id])

  // 메모이제이션된 계산값들
  const formattedDate = useMemo(() => {
    return new Date(persona.createdAt).toLocaleDateString('ko-KR')
  }, [persona.createdAt])

  const activeStatusStyle = useMemo(() => {
    return persona.isActive 
      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
      : 'bg-gray-50 text-gray-500 dark:bg-gray-900/20 dark:text-gray-400'
  }, [persona.isActive])

  const avatarInitial = useMemo(() => {
    return persona.name.charAt(0).toUpperCase()
  }, [persona.name])

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            {persona.avatar ? (
              <img src={persona.avatar} alt={persona.name} className="object-cover" />
            ) : (
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {avatarInitial}
              </div>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-lg">{persona.name}</CardTitle>
            <CardDescription className="text-sm">{persona.role}</CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={persona.isActive}
            onCheckedChange={handleToggleActive}
            disabled={isToggling}
            className="data-[state=checked]:bg-green-500"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 톤과 설명 */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">톤: {persona.tone}</span>
          </div>
          {persona.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {persona.description}
            </p>
          )}
        </div>

        {/* 관심사 */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">관심사</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {persona.interests.map((interest, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* 전문분야 */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">전문분야</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {persona.expertise.map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>게시물 {postCount}개</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formattedDate}
          </div>
        </div>

        {/* 활성 상태 표시 */}
        <div className={`text-center py-1 rounded text-xs font-medium ${activeStatusStyle}`}>
          {persona.isActive ? '활성' : '비활성'}
        </div>
      </CardContent>
    </Card>
  )
})