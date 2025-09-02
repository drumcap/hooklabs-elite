# ======================
# 멀티 스테이지 빌드 Dockerfile
# Next.js 애플리케이션을 위한 최적화된 이미지
# ======================

# 1단계: 의존성 설치 및 빌드
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저 설정 (npm 사용)
COPY package*.json ./

# 보안 업데이트 및 필수 패키지 설치
RUN apk add --no-cache libc6-compat git curl && \
    npm ci --only=production --silent && \
    npm cache clean --force

# ======================
# 2단계: 소스코드 복사 및 빌드
# ======================
FROM base AS builder

# 개발 의존성 포함하여 모든 의존성 설치
RUN npm ci --silent

# 소스코드 복사
COPY . .
COPY .env.example .env.local

# Next.js 텔레메트리 비활성화 (개인정보 보호)
ENV NEXT_TELEMETRY_DISABLED=1

# 타입 체크 및 린트 검사
RUN npm run lint && \
    npx tsc --noEmit

# Next.js 애플리케이션 빌드
RUN npm run build

# ======================
# 3단계: 프로덕션 이미지 생성
# ======================
FROM node:20-alpine AS runner

# 보안을 위한 비root 유저 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 작업 디렉토리 설정
WORKDIR /app

# 필수 시스템 패키지만 설치
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init

# Next.js 텔레메트리 비활성화
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

# 빌드된 애플리케이션과 필요한 파일들만 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# package.json 복사 (버전 정보 등을 위해)
COPY --from=builder /app/package.json ./package.json

# 헬스체크 스크립트 복사
COPY --from=builder /app/scripts/health-check.sh ./health-check.sh
RUN chmod +x ./health-check.sh

# 포트 노출
EXPOSE 3000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ./health-check.sh

# 비root 유저로 전환
USER nextjs

# 애플리케이션 실행 (dumb-init 사용으로 시그널 처리 개선)
CMD ["dumb-init", "node", "server.js"]