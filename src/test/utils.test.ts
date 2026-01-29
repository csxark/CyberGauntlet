import { describe, it, expect, beforeEach } from 'vitest';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('challenge progress storage', () => {
    it('should store and retrieve challenge progress', () => {
      const teamId = 'test-team';
      const progress = {
        questionId: 'q1',
        startedAt: Date.now(),
        attempts: 3,
        completed: false,
        elapsedTime: 120,
      };

      localStorage.setItem(
        `cybergauntlet_progress_${teamId}`,
        JSON.stringify(progress)
      );

      const retrieved = JSON.parse(
        localStorage.getItem(`cybergauntlet_progress_${teamId}`) || '{}'
      );

      expect(retrieved.questionId).toBe('q1');
      expect(retrieved.attempts).toBe(3);
      expect(retrieved.completed).toBe(false);
    });

    it('should store completed challenges list', () => {
      const teamId = 'test-team';
      const completed = ['q1', 'q2', 'q3'];

      localStorage.setItem(
        `cybergauntlet_completed_${teamId}`,
        JSON.stringify(completed)
      );

      const retrieved = JSON.parse(
        localStorage.getItem(`cybergauntlet_completed_${teamId}`) || '[]'
      );

      expect(retrieved).toHaveLength(3);
      expect(retrieved).toContain('q1');
      expect(retrieved).toContain('q2');
      expect(retrieved).toContain('q3');
    });

    it('should handle auth session storage', () => {
      const authData = {
        teamId: 'Parallax',
        teamName: 'Parallax',
        leaderName: 'Madhav Agarwal',
      };

      localStorage.setItem('cybergauntlet_auth', JSON.stringify(authData));

      const retrieved = JSON.parse(
        localStorage.getItem('cybergauntlet_auth') || '{}'
      );

      expect(retrieved.teamId).toBe('Parallax');
      expect(retrieved.teamName).toBe('Parallax');
      expect(retrieved.leaderName).toBe('Madhav Agarwal');
    });
  });

  describe('time formatting', () => {
    const formatTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00:00');
      expect(formatTime(59)).toBe('00:00:59');
      expect(formatTime(60)).toBe('00:01:00');
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3661)).toBe('01:01:01');
    });

    it('should handle large time values', () => {
      expect(formatTime(7200)).toBe('02:00:00');
      expect(formatTime(86400)).toBe('24:00:00'); // 24 hours
    });
  });

  describe('flag validation', () => {
    const isValidFlagFormat = (flag: string): boolean => {
      return flag.startsWith('CG{') && flag.endsWith('}');
    };

    it('should validate correct flag format', () => {
      expect(isValidFlagFormat('CG{test_flag}')).toBe(true);
      expect(isValidFlagFormat('CG{123}')).toBe(true);
      expect(isValidFlagFormat('CG{SpToWP}')).toBe(true);
    });

    it('should reject invalid flag formats', () => {
      expect(isValidFlagFormat('FLAG{test}')).toBe(false);
      expect(isValidFlagFormat('CG[test]')).toBe(false);
      expect(isValidFlagFormat('test_flag')).toBe(false);
      expect(isValidFlagFormat('CG{test')).toBe(false);
      expect(isValidFlagFormat('')).toBe(false);
    });
  });

  describe('device ID generation', () => {
    it('should generate consistent device ID', () => {
      const generateDeviceId = (): string => {
        const stored = localStorage.getItem('cybergauntlet_current_device');
        if (stored) return stored;

        const deviceId = `device_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem('cybergauntlet_current_device', deviceId);
        return deviceId;
      };

      const id1 = generateDeviceId();
      const id2 = generateDeviceId();

      expect(id1).toBe(id2);
      expect(id1).toContain('device_');
    });
  });
});
