import {
    generateUniqueId,
    truncateString,
    isValidUrl,
    sanitizeInput,
    formatDate,
  } from '../../utils/helpers';
  
  describe('helpers', () => {
  
    describe('generateUniqueId', () => {
      it('should generate a unique ID', () => {
        const id1 = generateUniqueId();
        const id2 = generateUniqueId();
        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toEqual(id2);
      });
    });
  
    describe('truncateString', () => {
      it('should return the string if it is shorter than the maxLength', () => {
        const str = 'Short string';
        const result = truncateString(str, 20);
        expect(result).toBe(str);
      });
  
      it('should truncate the string and add "..." if it exceeds the maxLength', () => {
        const str = 'This is a very long string that needs to be truncated';
        const result = truncateString(str, 20);
        expect(result).toBe('This is a very long...');
      });
  
      it('should return an empty string if input is undefined', () => {
        const result = truncateString(undefined, 10);
        expect(result).toBe('');
      });
    });
  
    describe('isValidUrl', () => {
      it('should return true for a valid URL', () => {
        const url = 'https://www.example.com';
        const result = isValidUrl(url);
        expect(result).toBe(true);
      });
  
      it('should return false for an invalid URL', () => {
        const url = 'invalid-url';
        const result = isValidUrl(url);
        expect(result).toBe(false);
      });
    });
  
    describe('sanitizeInput', () => {
      it('should remove HTML tags from the input', () => {
        const input = '<div>Hello</div><p>World</p>';
        const result = sanitizeInput(input);
        expect(result).toBe('HelloWorld');
      });
  
      it('should return the original string if there are no HTML tags', () => {
        const input = 'No HTML here!';
        const result = sanitizeInput(input);
        expect(result).toBe(input);
      });
    });
  
    describe('formatDate', () => {
      it('should format the date as ISO string', () => {
        const date = new Date('2024-08-12T15:24:00Z');
        const result = formatDate(date);
        expect(result).toBe('2024-08-12T15:24:00.000Z');
      });
    });
  
  });
  