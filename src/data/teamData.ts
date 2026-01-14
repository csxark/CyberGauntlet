export interface TeamData {
  id: string;
  leaderName: string;
}

export const teams: TeamData[] = [
  
  { "id": "Parallax", "leaderName": "Madhav Agarwal" },
  { "id": "SnackOverflow", "leaderName": "Varshitha vasaguddam" },
  { "id": "NEXUS", "leaderName": "Aarav Sharma" },
  { "id": "The encrypters", "leaderName": "Payal Yadav" },
  { "id": "A3K", "leaderName": "Aadya Agarwal" },
  { "id": "Capture crew", "leaderName": "Snehal Singh" },
  { "id": "Team KBC", "leaderName": "Vivek Kumar" },
  { "id": "633", "leaderName": "Abhigyan Seth" },
  { "id": "Kasukabe defense force", "leaderName": "Avichal Khanna" },
  { "id": "CyberCrime", "leaderName": "Manas Malhotra" },
  { "id": "Aatankwadi", "leaderName": "Sharanya" },
  { "id": "aag", "leaderName": "Harshit" },
  { "id": "Choki-Choki", "leaderName": "Ambika" },
  { "id": "Elite Party", "leaderName": "Nishchal" },
  { "id": "admin", "leaderName": "ark" },

];

export const validateTeam = (teamName: string, leaderName: string): TeamData | null => {
  const tn = teamName.trim().toLowerCase();
  const ln = leaderName.trim().toLowerCase();
  if (!tn || !ln) return null;

  // Match by team id (treated as team name) and leader name, case-insensitive
  return (
    teams.find(
      (t) => t.id.trim().toLowerCase() === tn && t.leaderName.trim().toLowerCase() === ln
    ) || null
  );
};
