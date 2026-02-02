import { describe, it, expect } from 'vitest';
import { validateTeam, teams } from '../data/teamData';

describe('validateTeam', () => {
  it('returns correct team for valid name/leader (case-insensitive)', () => {
    for (const t of teams) {
      expect(validateTeam(t.id, t.leaderName)).toEqual(t);
      expect(validateTeam(t.id.toUpperCase(), t.leaderName.toUpperCase())).toEqual(t);
      expect(validateTeam(' ' + t.id + ' ', ' ' + t.leaderName + ' ')).toEqual(t);
    }
  });

  it('returns null for wrong team name', () => {
    expect(validateTeam('NotATeam', 'Madhav Agarwal')).toBeNull();
  });

  it('returns null for wrong leader name', () => {
    expect(validateTeam('Parallax', 'Wrong Leader')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(validateTeam('', '')).toBeNull();
    expect(validateTeam(' ', ' ')).toBeNull();
  });

  it('returns null for partial match', () => {
    expect(validateTeam('Parallax', 'Madhav')).toBeNull();
    expect(validateTeam('Parall', 'Madhav Agarwal')).toBeNull();
  });
});
