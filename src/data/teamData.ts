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
  { id: 'iota', leaderName: 'Ivy' },
  { id: 'kappa', leaderName: 'Kyle' },
  { id: 'lambda', leaderName: 'Luna' },
  { id: 'mu', leaderName: 'Mia' },
  { id: 'nu', leaderName: 'Nate' },
  { id: 'xi', leaderName: 'Xander' },
  { id: 'omicron', leaderName: 'Olivia' },
  { id: 'pi', leaderName: 'Paul' },
  { id: 'rho', leaderName: 'Rita' },
  { id: 'sigma', leaderName: 'Sam' },
  { id: 'tau', leaderName: 'Tina' },
  { id: 'upsilon', leaderName: 'Uma' },
  { id: 'phi', leaderName: 'Phil' },
  { id: 'chi', leaderName: 'Chloe' },
  { id: 'psi', leaderName: 'Pete' },
  { id: 'omega', leaderName: 'Olga' },
];

export const validateTeam = (teamName: string, leaderName: string): TeamData | null => {
  return teams.find(
    (t) => teamName.toLowerCase() &&
           t.leaderName.toLowerCase() === leaderName.toLowerCase()
  ) || null;
};
