"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PersonaCard } from "./PersonaCard"
import { PersonaForm, type PersonaFormData } from "./PersonaForm"
import { PersonaTemplates } from "./PersonaTemplates"
import { 
  Plus, 
  Search, 
  Users, 
  UserCheck, 
  UserX,
  Loader2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface PersonaManagerProps {
  className?: string
}

export const PersonaManager = memo(function PersonaManager({ className }: PersonaManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingPersona, setEditingPersona] = useState<any>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  // Convex queries
  const personas = useQuery(api.personas.list)
  const postCounts = useQuery(api.personas.getPostCounts)
  
  // Convex mutations  
  const createPersona = useMutation(api.personas.create)
  const updatePersona = useMutation(api.personas.update)
  const deletePersona = useMutation(api.personas.remove)
  const toggleActivePersona = useMutation(api.personas.toggleActive)

  const [isLoading, setIsLoading] = useState(false)

  // 메모이제이션된 필터링 로직
  const filteredPersonas = useMemo(() => {
    if (!personas) return []
    
    return personas.filter((persona: any) => {
      const matchesSearch = persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           persona.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           persona.interests.some(interest => 
                             interest.toLowerCase().includes(searchTerm.toLowerCase())
                           )
      
      const matchesTab = activeTab === "all" || 
                        (activeTab === "active" && persona.isActive) ||
                        (activeTab === "inactive" && !persona.isActive)
      
      return matchesSearch && matchesTab
    })
  }, [personas, searchTerm, activeTab])

  // 메모이제이션된 통계 계산
  const stats = useMemo(() => {
    if (!personas) return { active: 0, inactive: 0, total: 0 }
    
    const active = personas.filter(p => p.isActive).length
    const inactive = personas.filter(p => !p.isActive).length
    const total = personas.length
    
    return { active, inactive, total }
  }, [personas])

  // 메모이제이션된 게시물 수 계산 함수
  const getPostCount = useCallback((personaId: Id<"personas">) => {
    return postCounts?.find((count: any) => count.personaId === personaId)?.postCount || 0
  }, [postCounts])

  // 메모이제이션된 이벤트 핸들러들
  const handleCreatePersona = useCallback(async (data: PersonaFormData) => {
    setIsLoading(true)
    try {
      await createPersona(data)
      setShowDialog(false)
      setShowTemplates(false)
      toast.success("페르소나가 성공적으로 생성되었습니다.")
    } catch (error) {
      console.error("페르소나 생성 오류:", error)
      toast.error("페르소나 생성에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [createPersona])

  const handleUpdatePersona = useCallback(async (data: PersonaFormData) => {
    if (!editingPersona) return

    setIsLoading(true)
    try {
      await updatePersona({
        id: editingPersona._id,
        ...data
      })
      setEditingPersona(null)
      setShowDialog(false)
      toast.success("페르소나가 성공적으로 수정되었습니다.")
    } catch (error) {
      console.error("페르소나 수정 오류:", error)
      toast.error("페르소나 수정에 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [updatePersona, editingPersona])

  const handleDeletePersona = useCallback(async (personaId: Id<"personas">) => {
    if (!confirm("정말로 이 페르소나를 삭제하시겠습니까?")) return

    try {
      await deletePersona({ id: personaId })
      toast.success("페르소나가 성공적으로 삭제되었습니다.")
    } catch (error: any) {
      console.error("페르소나 삭제 오류:", error)
      toast.error(error.message || "페르소나 삭제에 실패했습니다.")
    }
  }, [deletePersona])

  const handleToggleActive = useCallback(async (personaId: Id<"personas">) => {
    try {
      await toggleActivePersona({ id: personaId })
      toast.success("페르소나 상태가 변경되었습니다.")
    } catch (error) {
      console.error("페르소나 상태 변경 오류:", error)
      toast.error("페르소나 상태 변경에 실패했습니다.")
    }
  }, [toggleActivePersona])

  const handleEditPersona = useCallback((persona: any) => {
    setEditingPersona(persona)
    setShowTemplates(false)
    setShowDialog(true)
  }, [])

  const handleNewPersona = useCallback(() => {
    setEditingPersona(null)
    setShowTemplates(true)
    setShowDialog(true)
  }, [])

  const handleTemplateSelect = useCallback((template: PersonaFormData) => {
    setShowTemplates(false)
    setEditingPersona(template)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setShowDialog(false)
    setEditingPersona(null)
    setShowTemplates(false)
  }, [])

  if (personas === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">페르소나 관리</h1>
          <p className="text-muted-foreground">
            AI 게시물 생성을 위한 다양한 페르소나를 생성하고 관리하세요
          </p>
        </div>
        <Button onClick={handleNewPersona}>
          <Plus className="h-4 w-4 mr-2" />
          새 페르소나
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-muted-foreground">전체 페르소나</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <UserCheck className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-muted-foreground">활성 페르소나</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <UserX className="h-8 w-8 text-gray-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-muted-foreground">비활성 페르소나</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="페르소나 이름, 역할, 관심사로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="active">활성</TabsTrigger>
                <TabsTrigger value="inactive">비활성</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Personas Grid */}
      {filteredPersonas.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">페르소나가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 
                "검색 조건에 맞는 페르소나를 찾을 수 없습니다." : 
                "첫 번째 페르소나를 만들어 시작해보세요."
              }
            </p>
            {!searchTerm && (
              <Button onClick={handleNewPersona}>
                <Plus className="h-4 w-4 mr-2" />
                페르소나 만들기
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonas.map((persona) => (
            <PersonaCard
              key={persona._id}
              persona={persona}
              postCount={getPostCount(persona._id)}
              onEdit={handleEditPersona}
              onDelete={handleDeletePersona}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showTemplates 
                ? "페르소나 템플릿 선택" 
                : editingPersona && editingPersona._id 
                  ? "페르소나 수정" 
                  : "새 페르소나 만들기"
              }
            </DialogTitle>
            <DialogDescription>
              {showTemplates 
                ? "미리 준비된 템플릿 중 하나를 선택하거나 직접 만들어보세요." 
                : editingPersona && editingPersona._id 
                  ? "페르소나 정보를 수정하세요." 
                  : "AI가 게시물을 생성할 때 사용할 페르소나를 설정하세요."
              }
            </DialogDescription>
          </DialogHeader>

          {showTemplates ? (
            <PersonaTemplates onSelectTemplate={handleTemplateSelect} />
          ) : (
            <PersonaForm
              persona={editingPersona}
              onSave={editingPersona && editingPersona._id ? handleUpdatePersona : handleCreatePersona}
              onCancel={handleCloseDialog}
              isLoading={isLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})