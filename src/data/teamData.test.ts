import { describe, it, expect } from 'vitest';
import { validateTeam, teams } from './teamData';

describe('teamData', () => {
  describe('validateTeam', () => {
    it('should validate correct team name and leader name', () => {
      const result = validateTeam('Parallax', 'Madhav Agarwal');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
      expect(result?.leaderName).toBe('Madhav Agarwal');
    });

    it('should be case-insensitive', () => {
      const result = validateTeam('parallax', 'madhav agarwal');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
    });

    it('should handle extra whitespace', () => {
      const result = validateTeam('  Parallax  ', '  Madhav Agarwal  ');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
    });

    it('should return null for invalid team name', () => {
      const result = validateTeam('InvalidTeam', 'Madhav Agarwal');
      
      expect(result).toBeNull();
    });

    it('should return null for invalid leader name', () => {
      const result = validateTeam('Parallax', 'Wrong Leader');
      
      expect(result).toBeNull();
    });

    it('should return null for empty inputs', () => {
      const result1 = validateTeam('', 'Madhav Agarwal');
      const result2 = validateTeam('Parallax', '');
      const result3 = validateTeam('', '');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should validate all registered teams', () => {
      // Test a few more teams to ensure the logic works for all
      const testCases = [
        { team: 'SnackOverflow', leader: 'Varshitha vasaguddam' },
        { team: 'NEXUS', leader: 'Aarav Sharma' },
        { team: 'A3K', leader: 'Aadya Agarwal' },
      ];

      testCases.forEach(({ team, leader }) => {
        const result = validateTeam(team, leader);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(team);
        expect(result?.leaderName).toBe(leader);
      });
    });
  });

  describe('teams data', () => {
    it('should have correct structure', () => {
      expect(teams).toBeDefined();
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBeGreaterThan(0);
    });

    it('should have unique team IDs', () => {
      const teamIds = teams.map(t => t.id);
      const uniqueIds = new Set(teamIds);
      
      expect(teamIds.length).toBe(uniqueIds.size);
    });

    it('should have all required fields', () => {
      teams.forEach(team => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('leaderName');
        expect(typeof team.id).toBe('string');
        expect(typeof team.leaderName).toBe('string');
        expect(team.id.length).toBeGreaterThan(0);
        expect(team.leaderName.length).toBeGreaterThan(0);
      });
    });
  });
});
