import { describe, it, expect } from 'vitest';
import { validateTeam, teams } from '../teamData';

describe('teamData', () => {
  describe('validateTeam', () => {
    it('should validate correct team credentials', () => {
      const result = validateTeam('Parallax', 'Madhav Agarwal');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
      expect(result?.leaderName).toBe('Madhav Agarwal');
    });

    it('should be case-insensitive for team name', () => {
      const result = validateTeam('parallax', 'Madhav Agarwal');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
    });

    it('should be case-insensitive for leader name', () => {
      const result = validateTeam('Parallax', 'madhav agarwal');
      
      expect(result).not.toBeNull();
      expect(result?.leaderName).toBe('Madhav Agarwal');
    });

    it('should trim whitespace from inputs', () => {
      const result = validateTeam('  Parallax  ', '  Madhav Agarwal  ');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('Parallax');
    });

    it('should return null for invalid team name', () => {
      const result = validateTeam('InvalidTeam', 'Madhav Agarwal');
      
      expect(result).toBeNull();
    });

    it('should return null for invalid leader name', () => {
      const result = validateTeam('Parallax', 'Invalid Leader');
      
      expect(result).toBeNull();
    });

    it('should return null for mismatched team and leader', () => {
      const result = validateTeam('Parallax', 'Varshitha vasaguddam');
      
      expect(result).toBeNull();
    });

    it('should return null for empty team name', () => {
      const result = validateTeam('', 'Madhav Agarwal');
      
      expect(result).toBeNull();
    });

    it('should return null for empty leader name', () => {
      const result = validateTeam('Parallax', '');
      
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only inputs', () => {
      const result = validateTeam('   ', '   ');
      
      expect(result).toBeNull();
    });
  });

  describe('teams array', () => {
    it('should have at least one team', () => {
      expect(teams.length).toBeGreaterThan(0);
    });

    it('should have unique team IDs', () => {
      const ids = teams.map(team => team.id.toLowerCase());
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid team structure', () => {
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
