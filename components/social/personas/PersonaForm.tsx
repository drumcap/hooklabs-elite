"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar } from "@/components/ui/avatar"
import { 
  X, 
  Plus, 
  Save, 
  Loader2, 
  Upload,
  User,
  Briefcase,
  MessageCircle,
  Heart,
  Lightbulb
} from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface PersonaFormProps {
  persona?: {
    _id: Id<"personas">
    name: string
    role: string
    tone: string
    interests: string[]
    expertise: string[]
    avatar?: string
    description?: string
    isActive: boolean
  }
  onSave: (data: PersonaFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export interface PersonaFormData {
  name: string
  role: string
  tone: string
  interests: string[]
  expertise: string[]
  avatar?: string
  description?: string
}

const TONE_OPTIONS = [
  { value: "전문적", label: "전문적", description: "비즈니스 환경에 적합한 격식 있는 톤" },
  { value: "친근한", label: "친근한", description: "따뜻하고 접근하기 쉬운 톤" },
  { value: "유머러스", label: "유머러스", description: "재치 있고 재미있는 톤" },
  { value: "교육적", label: "교육적", description: "정보를 전달하고 가르치는 톤" },
  { value: "영감을 주는", label: "영감을 주는", description: "동기부여와 격려의 톤" },
  { value: "분석적", label: "분석적", description: "데이터와 논리 중심의 톤" }
]

const COMMON_INTERESTS = [
  "기술", "AI", "스타트업", "마케팅", "디자인", "개발",
  "비즈니스", "투자", "교육", "건강", "여행", "음식",
  "사진", "음악", "영화", "독서", "스포츠", "게임"
]

const COMMON_EXPERTISE = [
  "소프트웨어 개발", "데이터 분석", "디지털 마케팅", "UX/UI 디자인",
  "프로젝트 관리", "비즈니스 전략", "콘텐츠 마케팅", "SEO",
  "소셜미디어", "브랜딩", "세일즈", "고객서비스", "리더십", "교육"
]

export function PersonaForm({ persona, onSave, onCancel, isLoading }: PersonaFormProps) {
  const [formData, setFormData] = useState<PersonaFormData>({
    name: persona?.name || "",
    role: persona?.role || "",
    tone: persona?.tone || "",
    interests: persona?.interests || [],
    expertise: persona?.expertise || [],
    avatar: persona?.avatar || "",
    description: persona?.description || ""
  })

  const [newInterest, setNewInterest] = useState("")
  const [newExpertise, setNewExpertise] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = "페르소나 이름을 입력해주세요"
    }
    
    if (!formData.role.trim()) {
      newErrors.role = "역할을 입력해주세요"
    }
    
    if (!formData.tone.trim()) {
      newErrors.tone = "톤을 선택해주세요"
    }
    
    if (formData.interests.length === 0) {
      newErrors.interests = "최소 1개의 관심사를 추가해주세요"
    }
    
    if (formData.expertise.length === 0) {
      newErrors.expertise = "최소 1개의 전문분야를 추가해주세요"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      await onSave(formData)
    } catch (error) {
      console.error("페르소나 저장 중 오류:", error)
    }
  }

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }))
      setNewInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }))
  }

  const addExpertise = (expertise: string) => {
    if (expertise && !formData.expertise.includes(expertise)) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, expertise]
      }))
      setNewExpertise("")
    }
  }

  const removeExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(e => e !== expertise)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>기본 정보</span>
          </CardTitle>
          <CardDescription>
            페르소나의 기본적인 정보를 설정해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 아바타 */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              {formData.avatar ? (
                <img src={formData.avatar} alt={formData.name} className="object-cover" />
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
                  {formData.name.charAt(0).toUpperCase() || "P"}
                </div>
              )}
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar">아바타 URL (선택사항)</Label>
              <Input
                id="avatar"
                value={formData.avatar}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {/* 이름 */}
          <div>
            <Label htmlFor="name">페르소나 이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="예: 테크 전문가 김철수"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 역할 */}
          <div>
            <Label htmlFor="role">역할 *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder="예: SaaS 창업자, 개발자, 마케터"
              className={errors.role ? "border-red-500" : ""}
            />
            {errors.role && (
              <p className="text-sm text-red-500 mt-1">{errors.role}</p>
            )}
          </div>

          {/* 톤 */}
          <div>
            <Label>톤 *</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
            >
              <SelectTrigger className={errors.tone ? "border-red-500" : ""}>
                <SelectValue placeholder="톤을 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tone && (
              <p className="text-sm text-red-500 mt-1">{errors.tone}</p>
            )}
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명 (선택사항)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="페르소나에 대한 간단한 설명"
            />
          </div>
        </CardContent>
      </Card>

      {/* 관심사 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>관심사</span>
          </CardTitle>
          <CardDescription>
            이 페르소나가 관심 있어하는 주제들을 추가해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="관심사 입력"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addInterest(newInterest)
                }
              }}
            />
            <Button 
              type="button" 
              onClick={() => addInterest(newInterest)}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 자주 사용되는 관심사 */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">자주 사용되는 관심사:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTERESTS.map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => addInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>

          {/* 선택된 관심사 */}
          <div>
            <p className="text-sm font-medium mb-2">선택된 관심사:</p>
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest) => (
                <Badge key={interest} variant="default" className="flex items-center space-x-1">
                  <span>{interest}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeInterest(interest)}
                  />
                </Badge>
              ))}
            </div>
            {errors.interests && (
              <p className="text-sm text-red-500 mt-1">{errors.interests}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 전문분야 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>전문분야</span>
          </CardTitle>
          <CardDescription>
            이 페르소나의 전문 지식과 경험 영역을 추가해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={newExpertise}
              onChange={(e) => setNewExpertise(e.target.value)}
              placeholder="전문분야 입력"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addExpertise(newExpertise)
                }
              }}
            />
            <Button 
              type="button" 
              onClick={() => addExpertise(newExpertise)}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 자주 사용되는 전문분야 */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">자주 사용되는 전문분야:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_EXPERTISE.map((expertise) => (
                <Badge
                  key={expertise}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => addExpertise(expertise)}
                >
                  {expertise}
                </Badge>
              ))}
            </div>
          </div>

          {/* 선택된 전문분야 */}
          <div>
            <p className="text-sm font-medium mb-2">선택된 전문분야:</p>
            <div className="flex flex-wrap gap-2">
              {formData.expertise.map((expertise) => (
                <Badge key={expertise} variant="secondary" className="flex items-center space-x-1">
                  <span>{expertise}</span>
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeExpertise(expertise)}
                  />
                </Badge>
              ))}
            </div>
            {errors.expertise && (
              <p className="text-sm text-red-500 mt-1">{errors.expertise}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {persona ? "수정" : "생성"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}