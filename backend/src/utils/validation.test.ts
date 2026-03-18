import * as fc from 'fast-check';
import { validateRegistrationNumber, computeGroup, validateEmail } from './validation';

describe('Validation Utilities', () => {
  describe('validateRegistrationNumber', () => {
    it('should accept valid registration numbers', () => {
      expect(validateRegistrationNumber('RA2411003010008')).toBe(true);
      expect(validateRegistrationNumber('RA123')).toBe(true);
      expect(validateRegistrationNumber('RA1')).toBe(true);
    });

    it('should reject invalid registration numbers', () => {
      expect(validateRegistrationNumber('R123')).toBe(false);
      expect(validateRegistrationNumber('RA')).toBe(false);
      expect(validateRegistrationNumber('123')).toBe(false);
      expect(validateRegistrationNumber('RAabc')).toBe(false);
    });

    // Property-based test
    it('should validate registration number format property', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 999999999 }), (num) => {
          const regNumber = `RA${num}`;
          expect(validateRegistrationNumber(regNumber)).toBe(true);
        })
      );
    });
  });

  describe('computeGroup', () => {
    it('should compute group correctly', () => {
      expect(computeGroup('A', 1)).toBe('A1');
      expect(computeGroup('B', 2)).toBe('B2');
      expect(computeGroup('C', 1)).toBe('C1');
    });

    // Property-based test
    it('should always produce section + batch format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('A', 'B', 'C', 'D', 'E'),
          fc.constantFrom(1, 2),
          (section, batch) => {
            const group = computeGroup(section, batch);
            expect(group).toBe(`${section}${batch}`);
            expect(group.length).toBe(2);
          }
        )
      );
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });
});
