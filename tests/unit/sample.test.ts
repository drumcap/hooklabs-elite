/**
 * 샘플 단위 테스트
 * 테스트 환경 검증용 기본 테스트
 */

import { describe, it, expect } from 'vitest';

describe('테스트 환경 검증', () => {
  it('기본 테스트가 실행되어야 한다', () => {
    expect(1 + 1).toBe(2);
  });

  it('문자열 테스트가 작동해야 한다', () => {
    const message = 'Hello, Test!';
    expect(message).toContain('Test');
    expect(message).toHaveLength(12);
  });

  it('배열 테스트가 작동해야 한다', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
    expect(numbers[0]).toBe(1);
  });

  it('객체 테스트가 작동해야 한다', () => {
    const user = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };

    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
    expect(user).toMatchObject({
      id: 1,
      name: 'Test User',
    });
  });

  it('비동기 테스트가 작동해야 한다', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('done'), 10);
    });

    const result = await promise;
    expect(result).toBe('done');
  });

  it('에러 테스트가 작동해야 한다', () => {
    const throwError = () => {
      throw new Error('Test error');
    };

    expect(throwError).toThrow('Test error');
  });
});