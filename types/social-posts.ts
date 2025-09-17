import { Id } from "@/convex/_generated/dataModel"

export type PostStatus = "draft" | "scheduled" | "published" | "failed"

export interface SocialPost {
  _id: Id<"socialPosts">
  _creationTime: number
  userId: Id<"users">
  personaId: Id<"personas">
  originalContent: string
  finalContent: string
  platforms: string[]
  status: PostStatus
  hashtags?: string[]
  mediaUrls?: string[]
  threadCount?: number
  scheduledFor?: string
  publishedAt?: string
  metrics?: {
    impressions?: number
    reach?: number
    engagement?: number
    likes?: number
    comments?: number
    shares?: number
    clicks?: number
    saves?: number
    profileVisits?: number
    follows?: number
    lastUpdated?: string
  }
  errorMessage?: string
  creditsUsed: number
  createdAt: string
  updatedAt: string
}

export interface Persona {
  _id: Id<"personas">
  _creationTime: number
  userId: Id<"users">
  name: string
  role: string
  tone: string
  interests: string[]
  expertise: string[]
  description?: string
  avatar?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SocialPostWithPersona extends SocialPost {
  persona?: Persona
}

export interface PostFilters {
  search: string
  status: PostStatus | "all"
  platform: string
  sortBy: "newest" | "oldest" | "popular"
}

export interface PostStats {
  total: number
  draft: number
  scheduled: number
  published: number
  failed: number
}