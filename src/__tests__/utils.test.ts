import { describe, it, expect, beforeEach } from 'vitest';

describe('Supabase Configuration', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });

  it('should detect when Supabase is not configured', () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = !!(url && key && url !== 'your-supabase-url' && key !== 'your-supabase-anon-key');
    
    expect(isConfigured).toBe(false);
  });

  it('should detect when Supabase is configured', () => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-key-123';
    
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = !!(url && key && url !== 'your-supabase-url' && key !== 'your-supabase-anon-key');
    
    expect(isConfigured).toBe(true);
  });

  it('should reject placeholder values', () => {
    process.env.VITE_SUPABASE_URL = 'your-supabase-url';
    process.env.VITE_SUPABASE_ANON_KEY = 'your-supabase-anon-key';
    
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    const isConfigured = !!(url && key && url !== 'your-supabase-url' && key !== 'your-supabase-anon-key');
    
    expect(isConfigured).toBe(false);
  });
});

describe('Team Statistics Aggregation', () => {
  const mockSubmissions = [
    { team_name: 'TeamA', question_id: 'q1', time_spent: 300, attempts: 2 },
    { team_name: 'TeamA', question_id: 'q2', time_spent: 450, attempts: 1 },
    { team_name: 'TeamB', question_id: 'q1', time_spent: 200, attempts: 3 },
  ];

  it('should aggregate team statistics', () => {
    const teamStats = new Map<string, any>();

    mockSubmissions.forEach(submission => {
      const existing = teamStats.get(submission.team_name) || {
        teamName: submission.team_name,
        completed: 0,
        totalTime: 0,
        totalAttempts: 0,
        bestTime: Infinity,
      };

      existing.completed += 1;
      existing.totalTime += submission.time_spent;
      existing.totalAttempts += submission.attempts;
      existing.bestTime = Math.min(existing.bestTime, submission.time_spent);

      teamStats.set(submission.team_name, existing);
    });

    const teamA = teamStats.get('TeamA');
    expect(teamA.completed).toBe(2);
    expect(teamA.totalTime).toBe(750);
    expect(teamA.totalAttempts).toBe(3);
    expect(teamA.bestTime).toBe(300);

    const teamB = teamStats.get('TeamB');
    expect(teamB.completed).toBe(1);
    expect(teamB.totalTime).toBe(200);
    expect(teamB.totalAttempts).toBe(3);
    expect(teamB.bestTime).toBe(200);
  });

  it('should sort teams by progress', () => {
    const teamStats = [
      { teamName: 'TeamA', completed: 3, totalTime: 900 },
      { teamName: 'TeamB', completed: 5, totalTime: 1200 },
      { teamName: 'TeamC', completed: 5, totalTime: 1000 },
    ];

    const sorted = [...teamStats].sort((a, b) => {
      if (b.completed !== a.completed) {
        return b.completed - a.completed;
      }
      return a.totalTime - b.totalTime;
    });

    expect(sorted[0].teamName).toBe('TeamC');
    expect(sorted[1].teamName).toBe('TeamB');
    expect(sorted[2].teamName).toBe('TeamA');
  });

  it('should sort teams by speed', () => {
    const teamStats = [
      { teamName: 'TeamA', completed: 3, totalTime: 900 },
      { teamName: 'TeamB', completed: 3, totalTime: 1200 },
      { teamName: 'TeamC', completed: 3, totalTime: 800 },
    ];

    const sorted = [...teamStats].sort((a, b) => a.totalTime - b.totalTime);

    expect(sorted[0].teamName).toBe('TeamC');
    expect(sorted[1].teamName).toBe('TeamA');
    expect(sorted[2].teamName).toBe('TeamB');
  });
});
