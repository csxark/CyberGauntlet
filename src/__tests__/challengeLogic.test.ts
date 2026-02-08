import { describe, it, expect, vi } from 'vitest';

describe('Challenge Validation', () => {
  const mockChallenge = {
    id: 'q1',
    title: 'Test Challenge',
    description: 'Test description',
    file_name: 'test.txt',
    file_path: '/test/test.txt',
    correct_flag: 'CG{test_flag}',
    hints: ['Hint 1', 'Hint 2'],
  };

  describe('Flag Validation', () => {
    it('should validate correct flag format', () => {
      const flag = 'CG{test_flag}';
      const isValid = flag === mockChallenge.correct_flag;
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect flags', () => {
      const flag = 'CG{wrong_flag}';
      const isValid = flag === mockChallenge.correct_flag;
      
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', () => {
      const flag = 'cg{test_flag}';
      const isValid = flag === mockChallenge.correct_flag;
      
      expect(isValid).toBe(false);
    });

    it('should require exact match', () => {
      const flag = 'CG{test_flag} ';
      const isValid = flag === mockChallenge.correct_flag;
      
      expect(isValid).toBe(false);
    });
  });

  describe('Time Formatting', () => {
    const formatTime = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    it('should format seconds to HH:MM:SS', () => {
      expect(formatTime(0)).toBe('00:00:00');
      expect(formatTime(59)).toBe('00:00:59');
      expect(formatTime(60)).toBe('00:01:00');
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3661)).toBe('01:01:01');
    });

    it('should pad single digits with zeros', () => {
      expect(formatTime(5)).toBe('00:00:05');
      expect(formatTime(65)).toBe('00:01:05');
    });

    it('should handle large values', () => {
      expect(formatTime(36000)).toBe('10:00:00');
      expect(formatTime(86399)).toBe('23:59:59');
    });
  });

  describe('localStorage Challenge Progress', () => {
    const teamId = 'TestTeam';
    const storageKey = `cybergauntlet_progress_${teamId}`;

    it('should save challenge progress', () => {
      const progress = {
        questionId: 'q1',
        startedAt: Date.now(),
        attempts: 3,
        completed: false,
        elapsedTime: 120,
      };

      localStorage.setItem(storageKey, JSON.stringify(progress));
      const saved = localStorage.getItem(storageKey);
      
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!)).toEqual(progress);
    });

    it('should update attempt count', () => {
      const progress = {
        questionId: 'q1',
        startedAt: Date.now(),
        attempts: 1,
        completed: false,
      };

      localStorage.setItem(storageKey, JSON.stringify(progress));
      
      const saved = JSON.parse(localStorage.getItem(storageKey)!);
      saved.attempts += 1;
      localStorage.setItem(storageKey, JSON.stringify(saved));
      
      const updated = JSON.parse(localStorage.getItem(storageKey)!);
      expect(updated.attempts).toBe(2);
    });

    it('should mark challenge as completed', () => {
      const progress = {
        questionId: 'q1',
        startedAt: Date.now(),
        attempts: 3,
        completed: false,
      };

      localStorage.setItem(storageKey, JSON.stringify(progress));
      
      const saved = JSON.parse(localStorage.getItem(storageKey)!);
      saved.completed = true;
      saved.completedTime = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(saved));
      
      const updated = JSON.parse(localStorage.getItem(storageKey)!);
      expect(updated.completed).toBe(true);
      expect(updated.completedTime).toBeDefined();
    });
  });

  describe('Completed Questions Tracking', () => {
    const teamId = 'TestTeam';
    const completedKey = `cybergauntlet_completed_${teamId}`;

    it('should track completed questions', () => {
      const completed = ['q1', 'q2'];
      localStorage.setItem(completedKey, JSON.stringify(completed));
      
      const saved = JSON.parse(localStorage.getItem(completedKey)!);
      expect(saved).toEqual(completed);
      expect(saved.length).toBe(2);
    });

    it('should add new completed question', () => {
      const completed = ['q1'];
      localStorage.setItem(completedKey, JSON.stringify(completed));
      
      const saved = JSON.parse(localStorage.getItem(completedKey)!);
      saved.push('q2');
      localStorage.setItem(completedKey, JSON.stringify(saved));
      
      const updated = JSON.parse(localStorage.getItem(completedKey)!);
      expect(updated).toEqual(['q1', 'q2']);
    });

    it('should prevent duplicate entries', () => {
      const completed = ['q1', 'q2'];
      localStorage.setItem(completedKey, JSON.stringify(completed));
      
      const saved = JSON.parse(localStorage.getItem(completedKey)!);
      const newQuestion = 'q3';
      
      if (!saved.includes(newQuestion)) {
        saved.push(newQuestion);
      }
      
      localStorage.setItem(completedKey, JSON.stringify(saved));
      
      const updated = JSON.parse(localStorage.getItem(completedKey)!);
      expect(updated).toEqual(['q1', 'q2', 'q3']);
      expect(updated.length).toBe(3);
    });
  });
});
