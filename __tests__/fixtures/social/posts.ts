/**
 * 소셜 미디어 게시물 관련 테스트 픽스처 데이터
 * 다양한 게시물 유형과 상태를 포함합니다.
 */

import { createMockSocialPost, createMockPostVariant, createMockScheduledPost } from '../../test-utils';

// 기본 게시물들
export const mockSocialPosts = {
  // 제품 출시 공지
  productLaunch: createMockSocialPost({
    _id: 'post_product_launch',
    personaId: 'persona_saas_founder',
    originalContent: '새로운 AI 기반 자동화 기능을 출시했습니다. 사용자들의 피드백을 바탕으로 개발한 혁신적인 기능입니다.',
    finalContent: '🚀 새로운 AI 자동화 기능을 출시했습니다!\n\n사용자 피드백을 바탕으로 개발한 혁신적인 기능:\n✅ 작업 시간 70% 단축\n✅ 직관적인 UI/UX\n✅ 실시간 성과 분석\n\n#AI #자동화 #제품출시 #혁신',
    platforms: ['twitter', 'threads'],
    status: 'published',
    publishedAt: '2024-11-21T10:30:00.000Z',
    hashtags: ['#AI', '#자동화', '#제품출시', '#혁신'],
    creditsUsed: 8,
    metrics: {
      twitter: {
        views: 2500,
        likes: 85,
        retweets: 23,
        replies: 12,
        quotes: 5
      },
      threads: {
        views: 1800,
        likes: 62,
        reposts: 15,
        replies: 8
      },
      lastUpdatedAt: '2024-11-21T18:00:00.000Z'
    }
  }),

  // 개발 팁 공유
  developmentTip: createMockSocialPost({
    _id: 'post_dev_tip',
    personaId: 'persona_tech_developer',
    originalContent: 'React 성능 최적화를 위한 memo 사용법을 공유합니다.',
    finalContent: '⚡ React 성능 최적화 팁: React.memo 활용법\n\n불필요한 리렌더링을 방지하는 3가지 방법:\n\n1️⃣ 단순 props 비교\n2️⃣ 커스텀 비교 함수\n3️⃣ useMemo와 조합 사용\n\n코드 예시는 댓글에 👇\n\n#React #성능최적화 #개발팁',
    platforms: ['twitter', 'linkedin'],
    status: 'published',
    publishedAt: '2024-11-21T14:15:00.000Z',
    hashtags: ['#React', '#성능최적화', '#개발팁'],
    creditsUsed: 5,
    threadCount: 3
  }),

  // 마케팅 인사이트
  marketingInsight: createMockSocialPost({
    _id: 'post_marketing_insight',
    personaId: 'persona_digital_marketer',
    originalContent: '지난 달 A/B 테스트 결과를 공유합니다. 놀라운 결과가 나왔어요!',
    finalContent: '📊 지난 달 A/B 테스트 결과 공유!\n\n🔥 놀라운 발견:\n• CTA 버튼 색상만 바꿔도 클릭률 42% 향상\n• 헤드라인 A/B 테스트로 컨버전 28% 증가\n• 개인화 메시지로 오픈률 35% 상승\n\n작은 변화가 큰 차이를 만든다! 💡\n\n#A/B테스팅 #마케팅 #컨버전최적화 #데이터분석',
    platforms: ['twitter', 'threads', 'linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-11-22T09:00:00.000Z',
    hashtags: ['#A/B테스팅', '#마케팅', '#컨버전최적화', '#데이터분석'],
    creditsUsed: 6
  }),

  // 디자인 케이스 스터디
  designCaseStudy: createMockSocialPost({
    _id: 'post_design_case',
    personaId: 'persona_ux_designer',
    originalContent: '사용자 온보딩 플로우를 개선한 프로젝트 사례를 공유합니다.',
    finalContent: '🎨 온보딩 UX 개선 케이스 스터디\n\n문제: 신규 가입 후 이탈률 65%\n해결: 단계별 온보딩 플로우 재설계\n\n💡 주요 개선사항:\n✅ 5단계 → 3단계로 단순화\n✅ 인터랙티브 가이드 추가\n✅ 진행률 표시 개선\n\n결과: 완료율 78% 향상! 🚀\n\n#UX디자인 #온보딩 #사용자경험',
    platforms: ['twitter', 'threads'],
    status: 'draft',
    hashtags: ['#UX디자인', '#온보딩', '#사용자경험'],
    creditsUsed: 7,
    mediaUrls: ['https://example.com/onboarding-before.png', 'https://example.com/onboarding-after.png']
  }),

  // 실패한 게시물 (테스트용)
  failedPost: createMockSocialPost({
    _id: 'post_failed',
    personaId: 'persona_saas_founder',
    originalContent: '시스템 점검 공지',
    finalContent: '🔧 시스템 점검 안내\n\n일시: 2024-11-22 02:00-04:00 (KST)\n내용: 성능 개선 및 보안 업데이트\n\n점검 중 일시적 서비스 중단이 있을 수 있습니다.\n양해 부탁드립니다. 🙏\n\n#점검공지 #서비스개선',
    platforms: ['twitter'],
    status: 'failed',
    errorMessage: 'API rate limit exceeded',
    hashtags: ['#점검공지', '#서비스개선'],
    creditsUsed: 3
  })
};

// 게시물 변형들
export const mockPostVariants = {
  productLaunchVariants: [
    createMockPostVariant({
      _id: 'variant_1_launch',
      postId: 'post_product_launch',
      content: '🚀 AI 자동화의 새로운 시대가 열렸습니다!\n\n수개월간 개발한 혁신 기능을 드디어 공개합니다:\n\n🤖 스마트 자동화 엔진\n📊 실시간 성과 대시보드 \n⚡ 기존 대비 70% 시간 단축\n\n지금 바로 체험해보세요!\n\n#AI혁명 #자동화혁신 #생산성향상',
      overallScore: 92,
      scoreBreakdown: {
        engagement: 95,
        virality: 88,
        personaMatch: 94,
        readability: 90,
        trending: 93
      },
      isSelected: true,
      creditsUsed: 3
    }),
    
    createMockPostVariant({
      _id: 'variant_2_launch',
      postId: 'post_product_launch',
      content: '✨ 새로운 기능 출시 소식을 전해드립니다!\n\n사용자분들의 소중한 피드백으로 완성된 AI 자동화 기능:\n\n• 직관적인 설정 인터페이스\n• 강력한 자동화 워크플로우\n• 상세한 분석 리포트\n\n더 나은 경험을 위한 우리의 노력이 결실을 맺었습니다 🎉',
      overallScore: 87,
      scoreBreakdown: {
        engagement: 85,
        virality: 82,
        personaMatch: 90,
        readability: 92,
        trending: 86
      },
      isSelected: false,
      creditsUsed: 3
    }),
    
    createMockPostVariant({
      _id: 'variant_3_launch',
      postId: 'post_product_launch',
      content: '🔥 게임 체인저급 업데이트가 나왔습니다!\n\nAI가 당신의 업무를 자동화해드립니다:\n\n👆 클릭 한 번으로 설정 완료\n🎯 정확한 자동 실행\n📈 성과 추적까지 한번에\n\n이제 정말 중요한 일에만 집중하세요!\n\n#업무자동화 #AI도구 #효율성극대화',
      overallScore: 89,
      scoreBreakdown: {
        engagement: 92,
        virality: 91,
        personaMatch: 87,
        readability: 88,
        trending: 87
      },
      isSelected: false,
      creditsUsed: 3
    })
  ],

  developmentTipVariants: [
    createMockPostVariant({
      _id: 'variant_1_dev',
      postId: 'post_dev_tip',
      content: '⚡ React 성능 최적화 실전 가이드\n\n불필요한 리렌더링으로 앱이 느려지고 있다면?\nReact.memo()가 해답입니다!\n\n✅ props 변화 시에만 리렌더링\n✅ 메모이제이션으로 성능 향상\n✅ 커스텀 비교 함수 지원\n\n실제 코드 예시와 성능 측정 결과는 스레드에서 확인하세요 👇',
      overallScore: 91,
      scoreBreakdown: {
        engagement: 88,
        virality: 85,
        personaMatch: 95,
        readability: 93,
        trending: 94
      },
      isSelected: true,
      creditsUsed: 3
    })
  ]
};

// 스케줄된 게시물들
export const mockScheduledPosts = {
  tomorrowMorning: createMockScheduledPost({
    _id: 'scheduled_tomorrow_morning',
    postId: 'post_marketing_insight',
    platform: 'twitter',
    socialAccountId: 'account_twitter_main',
    scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12시간 후
    status: 'pending'
  }),

  nextWeek: createMockScheduledPost({
    _id: 'scheduled_next_week',
    postId: 'post_design_case',
    platform: 'threads',
    socialAccountId: 'account_threads_main',
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
    status: 'pending'
  }),

  failedSchedule: createMockScheduledPost({
    _id: 'scheduled_failed',
    postId: 'post_failed',
    platform: 'twitter',
    socialAccountId: 'account_twitter_main',
    scheduledFor: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    status: 'failed',
    error: 'Authentication failed: Token expired',
    retryCount: 3,
    maxRetries: 3
  })
};

// 게시물 템플릿들
export const postTemplates = {
  productAnnouncement: {
    title: '제품/기능 발표',
    structure: [
      '🚀 발표 메시지',
      '주요 기능/개선사항 (3-5개)',
      '사용자 혜택',
      '액션 유도',
      '해시태그'
    ],
    suggestedHashtags: ['#제품출시', '#기능업데이트', '#혁신'],
    platforms: ['twitter', 'threads', 'linkedin']
  },

  tipSharing: {
    title: '팁/노하우 공유',
    structure: [
      '💡 문제/상황 제시',
      '해결방법/팁 제시 (번호 매기기)',
      '추가 정보 제공',
      '관련 해시태그'
    ],
    suggestedHashtags: ['#팁', '#노하우', '#가이드'],
    platforms: ['twitter', 'threads']
  },

  caseStudy: {
    title: '케이스 스터디',
    structure: [
      '🎯 프로젝트/문제 소개',
      '접근 방법/과정',
      '결과/성과',
      '배운 점/인사이트',
      '해시태그'
    ],
    suggestedHashtags: ['#케이스스터디', '#프로젝트', '#성과'],
    platforms: ['twitter', 'threads', 'linkedin']
  },

  behindTheScenes: {
    title: '비하인드 스토리',
    structure: [
      '👀 상황/배경 설정',
      '과정/경험 공유',
      '느낀 점/교훈',
      '개인적 소감',
      '해시태그'
    ],
    suggestedHashtags: ['#비하인드', '#경험공유', '#스토리'],
    platforms: ['threads', 'instagram']
  }
};

// 플랫폼별 게시물 최적화 가이드
export const platformOptimization = {
  twitter: {
    maxLength: 280,
    optimalLength: 240,
    hashtagLimit: 2,
    threadMaxParts: 25,
    recommendedTone: 'concise',
    features: ['hashtags', 'mentions', 'threads', 'media']
  },

  threads: {
    maxLength: 500,
    optimalLength: 400,
    hashtagLimit: 5,
    threadMaxParts: 10,
    recommendedTone: 'conversational',
    features: ['hashtags', 'mentions', 'media', 'polls']
  },

  linkedin: {
    maxLength: 3000,
    optimalLength: 1300,
    hashtagLimit: 5,
    threadMaxParts: 1,
    recommendedTone: 'professional',
    features: ['hashtags', 'mentions', 'media', 'articles']
  }
};

// 게시물 성과 예측 모델
export const performancePrediction = {
  highEngagement: {
    characteristics: [
      'questions',
      'actionableAdvice',
      'personalStories',
      'controversialOpinions',
      'visualContent'
    ],
    expectedEngagementRate: 5.2,
    viralityPotential: 'high'
  },

  mediumEngagement: {
    characteristics: [
      'informativeContent',
      'industryNews',
      'toolRecommendations',
      'tutorials'
    ],
    expectedEngagementRate: 2.8,
    viralityPotential: 'medium'
  },

  lowEngagement: {
    characteristics: [
      'promotional',
      'businessUpdates',
      'genericAdvice',
      'repeatContent'
    ],
    expectedEngagementRate: 1.2,
    viralityPotential: 'low'
  }
};