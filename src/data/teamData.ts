export interface TeamData {
  id: string;
  leaderName: string;
}

export const teams: TeamData[] = [
  { id: 'alpha', leaderName: 'Alice' },
  { id: 'beta', leaderName: 'Bob' },
  { id: 'gamma', leaderName: 'Charlie' },
  { id: 'delta', leaderName: 'Diana' },
  { id: 'epsilon', leaderName: 'Ethan' },
  { id: 'zeta', leaderName: 'Zara' },
  { id: 'eta', leaderName: 'Eve' },
  { id: 'theta', leaderName: 'Tom' },
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
