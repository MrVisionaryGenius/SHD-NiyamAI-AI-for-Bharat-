import { describe, it, expect } from 'vitest';
import { calculateRiskScore, getSeverity } from './handler';

describe('Risk Scoring Algorithm', () => {
  describe('calculateRiskScore', () => {
    it('should return 0 for empty risks array', () => {
      const score = calculateRiskScore([]);
      expect(score).toBe(0);
    });

    it('should calculate score for single low severity risk', () => {
      const score = calculateRiskScore([{ severity: 'low' }]);
      expect(score).toBe(20);
    });

    it('should calculate score for single medium severity risk', () => {
      const score = calculateRiskScore([{ severity: 'medium' }]);
      expect(score).toBe(50);
    });

    it('should calculate score for single high severity risk', () => {
      const score = calculateRiskScore([{ severity: 'high' }]);
      expect(score).toBe(100);
    });

    it('should calculate composite score for multiple risks', () => {
      const score = calculateRiskScore([
        { severity: 'low' },
        { severity: 'medium' },
        { severity: 'high' }
      ]);
      // (20 + 50 + 100) / 3 = 56.67 -> 57
      expect(score).toBe(57);
    });

    it('should ensure score is within 0-100 bounds', () => {
      const score = calculateRiskScore([
        { severity: 'high' },
        { severity: 'high' },
        { severity: 'high' }
      ]);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getSeverity', () => {
    it('should return low for score 0', () => {
      expect(getSeverity(0)).toBe('low');
    });

    it('should return low for score 33', () => {
      expect(getSeverity(33)).toBe('low');
    });

    it('should return medium for score 34', () => {
      expect(getSeverity(34)).toBe('medium');
    });

    it('should return medium for score 66', () => {
      expect(getSeverity(66)).toBe('medium');
    });

    it('should return high for score 67', () => {
      expect(getSeverity(67)).toBe('high');
    });

    it('should return high for score 100', () => {
      expect(getSeverity(100)).toBe('high');
    });
  });

  describe('Score to Severity Mapping', () => {
    it('should correctly map all scores to severity levels', () => {
      // Test boundary values
      expect(getSeverity(0)).toBe('low');
      expect(getSeverity(33)).toBe('low');
      expect(getSeverity(34)).toBe('medium');
      expect(getSeverity(66)).toBe('medium');
      expect(getSeverity(67)).toBe('high');
      expect(getSeverity(100)).toBe('high');
    });
  });
});
