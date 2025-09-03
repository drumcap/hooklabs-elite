"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { 
  Briefcase, 
  Code, 
  Palette, 
  TrendingUp, 
  BookOpen, 
  Heart,
  Lightbulb,
  Rocket
} from "lucide-react"
import type { PersonaFormData } from "./PersonaForm"

interface PersonaTemplate {
  id: string
  name: string
  role: string
  tone: string
  interests: string[]
  expertise: string[]
  description: string
  icon: React.ComponentType<any>
  category: string
}

const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "tech-founder",
    name: "테크 창업가",
    role: "SaaS 창업자",
    tone: "영감을 주는",
    interests: ["스타트업", "AI", "기술", "투자", "비즈니스"],
    expertise: ["비즈니스 전략", "프로덕트 매니지먼트", "팀 리더십", "투자 유치"],
    description: "기술 기반 스타트업을 운영하며 혁신적인 아이디어를 공유하는 창업가",
    icon: Rocket,
    category: "비즈니스"
  },
  {
    id: "frontend-dev",
    name: "프론트엔드 개발자",
    role: "시니어 프론트엔드 개발자",
    tone: "교육적",
    interests: ["React", "JavaScript", "UI/UX", "성능 최적화", "웹 접근성"],
    expertise: ["React 개발", "TypeScript", "웹 성능", "모바일 최적화"],
    description: "최신 프론트엔드 기술을 활용해 사용자 경험을 개선하는 개발자",
    icon: Code,
    category: "개발"
  },
  {
    id: "ux-designer",
    name: "UX 디자이너",
    role: "프로덕트 디자이너",
    tone: "친근한",
    interests: ["디자인 시스템", "사용자 리서치", "프로토타이핑", "접근성"],
    expertise: ["사용자 경험 디자인", "인터페이스 디자인", "디자인 시스템", "사용자 리서치"],
    description: "사용자 중심의 디자인으로 더 나은 경험을 만드는 디자이너",
    icon: Palette,
    category: "디자인"
  },
  {
    id: "growth-marketer",
    name: "그로스 마케터",
    role: "디지털 마케팅 전문가",
    tone: "분석적",
    interests: ["데이터 분석", "A/B 테스트", "퍼널 최적화", "SEO", "소셜미디어"],
    expertise: ["디지털 마케팅", "데이터 분석", "성장 해킹", "콘텐츠 마케팅"],
    description: "데이터 기반으로 비즈니스 성장을 이끄는 마케터",
    icon: TrendingUp,
    category: "마케팅"
  },
  {
    id: "content-creator",
    name: "콘텐츠 크리에이터",
    role: "콘텐츠 마케터",
    tone: "유머러스",
    interests: ["스토리텔링", "브랜딩", "소셜미디어", "영상 제작", "사진"],
    expertise: ["콘텐츠 기획", "브랜드 스토리텔링", "소셜미디어 마케팅", "영상 편집"],
    description: "창의적인 콘텐츠로 브랜드 스토리를 전달하는 크리에이터",
    icon: Heart,
    category: "마케팅"
  },
  {
    id: "data-scientist",
    name: "데이터 사이언티스트",
    role: "데이터 분석가",
    tone: "전문적",
    interests: ["머신러닝", "데이터 시각화", "통계학", "Python", "AI"],
    expertise: ["데이터 분석", "머신러닝", "통계 모델링", "데이터 시각화"],
    description: "데이터에서 인사이트를 발견하고 비즈니스 가치를 창출하는 전문가",
    icon: Lightbulb,
    category: "개발"
  },
  {
    id: "business-coach",
    name: "비즈니스 코치",
    role: "경영 컨설턴트",
    tone: "영감을 주는",
    interests: ["리더십", "경영 전략", "조직 문화", "성과 관리", "교육"],
    expertise: ["경영 컨설팅", "조직 개발", "리더십 코칭", "전략 기획"],
    description: "조직과 개인의 성장을 돕는 비즈니스 코치",
    icon: Briefcase,
    category: "비즈니스"
  },
  {
    id: "educator",
    name: "교육자",
    role: "온라인 강사",
    tone: "교육적",
    interests: ["교육", "학습법", "온라인 코스", "지식 공유", "커뮤니티"],
    expertise: ["교육 콘텐츠 개발", "온라인 강의", "학습 경험 설계", "커뮤니티 운영"],
    description: "지식을 나누고 다른 사람의 성장을 돕는 교육 전문가",
    icon: BookOpen,
    category: "교육"
  }
]

interface PersonaTemplatesProps {
  onSelectTemplate: (template: PersonaFormData) => void
}

export function PersonaTemplates({ onSelectTemplate }: PersonaTemplatesProps) {
  const categories = Array.from(new Set(PERSONA_TEMPLATES.map(t => t.category)))

  const handleSelectTemplate = (template: PersonaTemplate) => {
    const formData: PersonaFormData = {
      name: template.name,
      role: template.role,
      tone: template.tone,
      interests: template.interests,
      expertise: template.expertise,
      description: template.description
    }
    onSelectTemplate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">페르소나 템플릿</h2>
        <p className="text-muted-foreground mt-2">
          미리 준비된 템플릿으로 빠르게 시작하거나, 직접 만들어보세요
        </p>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-primary">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERSONA_TEMPLATES
              .filter(template => template.category === category)
              .map((template) => {
                const Icon = template.icon
                return (
                  <Card 
                    key={template.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <div className="bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                            <Icon className="h-6 w-6" />
                          </div>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {template.role}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          톤: {template.tone}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          주요 관심사
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.interests.slice(0, 3).map((interest) => (
                            <Badge 
                              key={interest} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {interest}
                            </Badge>
                          ))}
                          {template.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          전문 분야
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.expertise.slice(0, 2).map((expertise) => (
                            <Badge 
                              key={expertise} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {expertise}
                            </Badge>
                          ))}
                          {template.expertise.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.expertise.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button 
                        className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        variant="outline"
                        size="sm"
                      >
                        이 템플릿 사용하기
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>
      ))}

      <Card className="border-dashed border-2 hover:border-primary transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Lightbulb className="h-6 w-6" />
          </div>
          <h3 className="font-semibold mb-2">직접 만들기</h3>
          <p className="text-muted-foreground text-sm mb-4">
            나만의 독특한 페르소나를 처음부터 만들어보세요
          </p>
          <Button 
            variant="outline"
            onClick={() => onSelectTemplate({
              name: "",
              role: "",
              tone: "",
              interests: [],
              expertise: [],
              description: ""
            })}
          >
            빈 템플릿으로 시작하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}