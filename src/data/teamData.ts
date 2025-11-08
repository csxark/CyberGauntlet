export interface TeamData {
  id: string;
  leaderName: string;
}

export const teams: TeamData[] = [
  { id: 'alpha', leaderName: 'A' },
  { id: 'beta', leaderName: 'B' },
  { id: 'gamma', leaderName: 'C' },
  { id: 'delta', leaderName: 'D' },
  { id: 'epsilon', leaderName: 'E' },
  { id: 'zeta', leaderName: 'F' },
  { id: 'theta', leaderName: 'G' },
  { id: 'iota', leaderName: 'H' },
  { id: 'kappa', leaderName: 'I' },
  { id: 'lambda', leaderName: 'J' },
];

export const validateTeam = (teamName: string, leaderName: string): TeamData | null => {
  return teams.find(
    (t) => teamName.toLowerCase() &&
           t.leaderName.toLowerCase() === leaderName.toLowerCase()
  ) || null;
};
