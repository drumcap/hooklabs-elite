/**
 * 페르소나 관련 테스트 픽스처 데이터
 * 다양한 페르소나 유형과 설정들을 포함합니다.
 */

import { createMockPersona } from '../../test-utils';

// 기본 페르소나들
export const mockPersonas = {
  // SaaS 창업자 페르소나
  saasFounder: createMockPersona({
    _id: 'persona_saas_founder',
    name: 'SaaS 창업자',
    role: '스타트업 CEO',
    tone: '전문적이고 친근한',
    interests: ['스타트업', '제품 개발', '사용자 경험', '비즈니스 전략'],
    expertise: ['SaaS', '제품 관리', '팀 리딩', '투자 유치'],
    description: '혁신적인 SaaS 제품을 만드는 창업자로서 기술과 비즈니스를 연결하는 인사이트를 공유합니다.',
    promptTemplates: {
      system: '당신은 성공적인 SaaS 스타트업을 운영하는 창업가입니다.',
      content: '실용적인 창업 경험과 제품 개발 노하우를 바탕으로 한 콘텐츠를 작성해주세요.',
      tone: '전문성과 친근함이 균형잡힌 톤으로 작성해주세요.'
    },
    settings: {
      useEmojis: true,
      includeHashtags: true,
      maxHashtags: 5,
      preferredPlatforms: ['twitter', 'threads', 'linkedin']
    }
  }),

  // 마케터 페르소나
  digitalMarketer: createMockPersona({
    _id: 'persona_digital_marketer',
    name: '디지털 마케터',
    role: '성장 마케터',
    tone: '열정적이고 데이터 기반',
    interests: ['디지털 마케팅', '성장 해킹', 'A/B 테스팅', '데이터 분석'],
    expertise: ['퍼포먼스 마케팅', 'SEO/SEM', '소셜 미디어', '컨버전 최적화'],
    description: '데이터 기반 마케팅으로 성과를 만드는 마케터의 실전 경험을 공유합니다.',
    promptTemplates: {
      system: '당신은 데이터 기반 성장 마케팅 전문가입니다.',
      content: '마케팅 전략과 실행 노하우를 구체적인 사례와 함께 설명해주세요.',
      tone: '열정적이면서도 분석적인 어조로 작성해주세요.'
    },
    settings: {
      useEmojis: true,
      includeHashtags: true,
      maxHashtags: 7,
      preferredPlatforms: ['twitter', 'threads'],
      focusKeywords: ['마케팅', '성장', '데이터', '실험']
    }
  }),

  // 개발자 페르소나
  techDeveloper: createMockPersona({
    _id: 'persona_tech_developer',
    name: '풀스택 개발자',
    role: '시니어 개발자',
    tone: '기술적이고 실용적',
    interests: ['웹 개발', '아키텍처', '성능 최적화', '개발자 도구'],
    expertise: ['React', 'Node.js', 'TypeScript', '클라우드', 'DevOps'],
    description: '실무에서 검증된 개발 기술과 베스트 프랙티스를 공유하는 개발자입니다.',
    promptTemplates: {
      system: '당신은 10년 경력의 풀스택 개발자입니다.',
      content: '개발 경험을 바탕으로 실용적인 기술 팁과 인사이트를 공유해주세요.',
      tone: '기술적 정확성을 유지하면서도 이해하기 쉽게 설명해주세요.'
    },
    settings: {
      useEmojis: false,
      includeHashtags: true,
      maxHashtags: 4,
      preferredPlatforms: ['twitter', 'linkedin'],
      focusKeywords: ['개발', '코드', '아키텍처', '성능']
    }
  }),

  // 디자이너 페르소나
  uxDesigner: createMockPersona({
    _id: 'persona_ux_designer',
    name: 'UX 디자이너',
    role: '프로덕트 디자이너',
    tone: '창의적이고 사용자 중심',
    interests: ['사용자 경험', 'UI/UX', '디자인 시스템', '사용자 리서치'],
    expertise: ['사용자 인터페이스', '프로토타이핑', '디자인 시스템', '사용성 테스팅'],
    description: '사용자 중심 디자인으로 제품 경험을 개선하는 디자이너의 관점을 공유합니다.',
    promptTemplates: {
      system: '당신은 사용자 경험을 최우선으로 생각하는 프로덕트 디자이너입니다.',
      content: '디자인 과정과 사용자 경험 개선 사례를 구체적으로 설명해주세요.',
      tone: '창의적이면서도 논리적인 접근으로 설명해주세요.'
    },
    settings: {
      useEmojis: true,
      includeHashtags: true,
      maxHashtags: 6,
      preferredPlatforms: ['twitter', 'threads', 'instagram'],
      focusKeywords: ['디자인', 'UX', '사용자', '경험']
    }
  }),

  // 콘텐츠 크리에이터 페르소나
  contentCreator: createMockPersona({
    _id: 'persona_content_creator',
    name: '테크 크리에이터',
    role: '콘텐츠 크리에이터',
    tone: '친근하고 교육적',
    interests: ['테크 리뷰', '튜토리얼', '트렌드 분석', '교육 콘텐츠'],
    expertise: ['콘텐츠 제작', '영상 편집', '스토리텔링', '커뮤니티 관리'],
    description: '복잡한 기술을 쉽게 설명하고 사람들에게 영감을 주는 콘텐츠를 만듭니다.',
    promptTemplates: {
      system: '당신은 기술을 쉽고 재미있게 설명하는 콘텐츠 크리에이터입니다.',
      content: '복잡한 내용을 일반인도 이해할 수 있도록 쉽게 설명해주세요.',
      tone: '친근하고 재미있으면서도 교육적인 톤으로 작성해주세요.'
    },
    settings: {
      useEmojis: true,
      includeHashtags: true,
      maxHashtags: 8,
      preferredPlatforms: ['twitter', 'threads', 'tiktok', 'youtube'],
      focusKeywords: ['팁', '가이드', '리뷰', '추천']
    }
  })
};

// 페르소나별 추천 콘텐츠 주제들
export const recommendedTopics = {
  saasFounder: [
    '새 기능 출시 소식',
    '창업 경험 공유',
    '제품 개발 과정',
    '팀 빌딩 팁',
    '투자 유치 경험',
    '고객 피드백 처리',
    '비즈니스 전략'
  ],
  digitalMarketer: [
    'A/B 테스팅 결과',
    '마케팅 캠페인 성과',
    '성장 해킹 팁',
    '데이터 분석 인사이트',
    '컨버전 최적화',
    '마케팅 도구 리뷰',
    '트렌드 분석'
  ],
  techDeveloper: [
    '코드 리팩토링 팁',
    '성능 최적화 방법',
    '새 기술 스택 도입',
    '버그 해결 경험',
    '아키텍처 개선',
    '개발 도구 추천',
    '베스트 프랙티스'
  ],
  uxDesigner: [
    '디자인 시스템 구축',
    '사용자 리서치 결과',
    '프로토타입 제작 과정',
    'UI 개선 사례',
    '사용성 테스트',
    '디자인 도구 사용법',
    '접근성 개선'
  ],
  contentCreator: [
    '튜토리얼 제작',
    '도구 리뷰',
    '트렌드 해석',
    '팁과 트릭',
    '비하인드 스토리',
    '질문 답변',
    '커뮤니티 소통'
  ]
};

// 페르소나별 선호 해시태그
export const preferredHashtags = {
  saasFounder: [
    '#스타트업', '#창업', '#SaaS', '#제품개발', '#비즈니스', 
    '#혁신', '#사용자경험', '#성장', '#팀빌딩', '#투자'
  ],
  digitalMarketer: [
    '#마케팅', '#디지털마케팅', '#성장해킹', '#데이터분석', 
    '#A/B테스팅', '#컨버전', '#SEO', '#SEM', '#퍼포먼스마케팅'
  ],
  techDeveloper: [
    '#개발', '#프로그래밍', '#코딩', '#아키텍처', '#성능최적화',
    '#React', '#NodeJS', '#TypeScript', '#클라우드', '#DevOps'
  ],
  uxDesigner: [
    '#디자인', '#UX', '#UI', '#사용자경험', '#디자인시스템',
    '#프로토타이핑', '#사용자리서치', '#접근성', '#인터랙션디자인'
  ],
  contentCreator: [
    '#콘텐츠', '#크리에이터', '#교육', '#튜토리얼', '#리뷰',
    '#팁', '#가이드', '#테크', '#트렌드', '#커뮤니티'
  ]
};

// 페르소나별 톤 가이드라인
export const toneGuidelines = {
  saasFounder: {
    formal: 70,      // 격식 수준 (0-100)
    friendly: 80,    // 친근함
    technical: 60,   // 기술적 깊이
    emotional: 50,   // 감정적 표현
    humorous: 40,    // 유머
    authoritative: 80 // 권위적
  },
  digitalMarketer: {
    formal: 50,
    friendly: 90,
    technical: 70,
    emotional: 70,
    humorous: 60,
    authoritative: 70
  },
  techDeveloper: {
    formal: 80,
    friendly: 40,
    technical: 95,
    emotional: 20,
    humorous: 30,
    authoritative: 90
  },
  uxDesigner: {
    formal: 60,
    friendly: 85,
    technical: 75,
    emotional: 60,
    humorous: 50,
    authoritative: 75
  },
  contentCreator: {
    formal: 30,
    friendly: 95,
    technical: 40,
    emotional: 80,
    humorous: 85,
    authoritative: 60
  }
};