import { useState, useEffect } from 'react';
import { Download, Terminal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { TerminalBox } from './TerminalBox';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ChallengePageProps {
  teamId: string;
  teamName: string;
  leaderName: string;
  onLogout: () => void;
}

interface LocalChallenge {
  questionId: string;
  startedAt: number;
  attempts: number;
  completed: boolean;
  completedTime?: number;
}

interface Question {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_path: string;
  correct_flag: string;
  hints: string[];
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "The Cryptographer's Dilemma",
description: "You are a cybersecurity consultant investigating a breach at the Ministry of Digital Secrets. The " +
  "lead cryptographer, Dr. Eliza Vance, disappeared just hours before the attack. The only thing " +
  "she left behind was a strange, encrypted diary entry and a file on her desktop labeled " +
  "cipher_collection.txt. Your team believes Dr. Vance was trying to leave a final, complex message before being " +
  "abducted—a message hidden among decoys. The diary entry gives you a vital clue, but you " +
  "must still figure out which cipher in the file holds the true flag and which ones are red herrings.",
    file_name: "cipher_collection.txt",
    file_path: "/challenges/q1/cipher_collection.txt",
    correct_flag: "CG{Guvf vf gur Synt!}",
    hints: ["This code is based on a simple rotational shift of 3 for every letter in the alphabet", "This message is encoded using Polybius square coordinates; you must first group the ciphertext by fives, then use a keyword to untangle the column order.","The decryption key for this substitution is half the alphabet, meaning the shift applied to the ciphertext is equal to the length of the shift itself."]
  },
  {
    "id": "q2",
    "title": "Pair Sum Optimization",
    "description": "You are auditing a data processing script for a university that needs to quickly count successful pairings of student IDs. You are given a large array of unique, positive, and sorted integer IDs. The university defines a successful pair as any two distinct IDs a, b in the array whose sum equals a specific target number, T. Your primary constraint is efficiency. Since the list is already sorted, you must devise an algorithm that counts all unique pairs in a single, highly optimized pass that avoids nested loops—a technique typically required for speed in large datasets.",
    "file_name": "",
    "file_path": "",
    "correct_flag": "CG{TWO_POINTERS_ALGORITHM}",
    "hints": [
      " Since the array is sorted, set one marker (a pointer) at the first element (index 0) and the second marker at the last element (index length - 1).",
      " At each step, you only need to calculate the sum of the elements at your two markers and compare it to T. If the sum is less than T, you must increase the sum, so move the low pointer one step inward. If the sum is greater than T, you must decrease the sum, so move the high pointer one step inward.",
      " Your entire solution can be contained within a simple while loop that continues as long as your low pointer is less than your high pointer."
    ]
  },
  {
    "id": "q3",
    "title": "The Security Key Reverser",
    "description": "You have recovered a C program designed to validate a 10-character security key. Due to poor programming practices, the key must pass through a two-step obfuscation process before it is checked against a hardcoded secret. To find the correct final flag, you must meticulously trace the logic of the processkey function.",
    "file_name": "security.c",
    "file_path": "/challenges/q3/security.c",
    "correct_flag": "CG{5E4D3A1B2C}",
    "hints": [
      "Swap the two halves — The key is split (A1B2C and 3D4E5) and exchanged.",
      "Reverse the new first half in place — after swapping, reverse indices 0 through 4.",
      "The flag is the final state of the key array after processing."
    ]
  },
  {
    "id": "q4",
    "title": "Invisible Ink Scenario",
    "description": "You have recovered a text file, secretnote.txt, which appears to contain nothing more than a simple, innocuous sentence. When you copy and paste the text, it seems normal, but a forensic tool confirms the file size is slightly larger than expected for the visible characters. Hidden zero-width Unicode characters encode the flag.",
    "file_name": "secretnote.txt",
    "file_path": "/challenges/q4/secretnote.txt",
    "correct_flag": "CG{THIS_YOUR_FLAG}",
    "hints": [
      "Zero-width characters (U200B, U200D) represent binary digits and encode ASCII via invisible text.",
      "Use a specialized tool to extract and translate the invisible Unicode sequence.",
      "Correct mapping from invisible characters to binary unlocks the true ASCII flag."
    ]
  },
{
  "id": "q5",
  "title": "The Final Register Readout",
  "description": "You are a penetration tester attempting to recover a sensitive 6-character access key stored in a proprietary system. You have managed to dump the raw memory register, but the developer didn't use standard decimal numbers. Instead, they used a custom 'Quinary System' encoding where all values are calculated using powers of five before being stored. The captured, encoded register value (in the Quinary System) is the following sequence of three-digit numbers separated by colons: (313 : 310 : 314 : 421 : 322 : 310)",
  "file_name": "",
  "file_path": "",
  "correct_flag": "CG{SPToWP}",
  "hints": [
    "Each three-digit number represents a character in the ASCII range",
    "Convert each quinary number to decimal using powers of 5",
    "Map the resulting decimal values to ASCII characters"
  ]
}
];

export function ChallengePage({ teamId, teamName, leaderName, onLogout }: ChallengePageProps) {
  const [flag, setFlag] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [challenge, setChallenge] = useState<LocalChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  // const [showLeaderboard, setShowLeaderboard] = useState(false);
  // const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);

  useEffect(() => {
    loadChallenge();
  }, [teamId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning && challenge && !challenge.completed) {
      interval = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          localStorage.setItem(`cybergauntlet_progress_${teamId}`, JSON.stringify({
            ...challenge,
            elapsedTime: newTime
          }));
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, challenge, teamId]);

  const loadChallenge = () => {
    try {
      const saved = localStorage.getItem(`cybergauntlet_progress_${teamId}`);
      const completed = localStorage.getItem(`cybergauntlet_completed_${teamId}`);
      setCompletedQuestions(completed ? JSON.parse(completed) : []);

      let localChallenge: LocalChallenge;

      if (saved) {
        const parsed = JSON.parse(saved);
        localChallenge = {
          questionId: parsed.questionId,
          startedAt: parsed.startedAt,
          attempts: parsed.attempts,
          completed: parsed.completed,
          completedTime: parsed.completedTime
        };
        setElapsedTime(parsed.elapsedTime || 0);
      } else {
        const availableQuestions = SAMPLE_QUESTIONS.filter(q => !(completed ? JSON.parse(completed) : []).includes(q.id));

        if (availableQuestions.length === 0) {
          setChallenge({ questionId: '', startedAt: 0, attempts: 0, completed: true });
          setLoading(false);
          return;
        }

        const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        localChallenge = {
          questionId: randomQuestion.id,
          startedAt: Date.now(),
          attempts: 0,
          completed: false
        };
        localStorage.setItem(`cybergauntlet_progress_${teamId}`, JSON.stringify({
          ...localChallenge,
          elapsedTime: 0
        }));
      }

      setChallenge(localChallenge);

      const q = SAMPLE_QUESTIONS.find(q => q.id === localChallenge.questionId);
      if (q) {
        setQuestion(q);
      }

      if (!localChallenge.completed) {
        setIsRunning(true);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading challenge:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !challenge) return;

    const newAttempts = challenge.attempts + 1;

    if (flag.trim() === question.correct_flag) {
      setResult('correct');
      setIsRunning(false);

      const completedTime = elapsedTime;
      const updatedChallenge = {
        ...challenge,
        completed: true,
        completedTime,
        attempts: newAttempts
      };

      localStorage.setItem(`cybergauntlet_progress_${teamId}`, JSON.stringify({
        ...updatedChallenge,
        elapsedTime: completedTime
      }));

      const newCompleted = [...completedQuestions, question.id];
      localStorage.setItem(`cybergauntlet_completed_${teamId}`, JSON.stringify(newCompleted));

      if (isSupabaseConfigured) {
        await supabase.from('leaderboard').insert({
          team_name: teamName,
          question_id: question.id,
          time_spent: completedTime,
          attempts: newAttempts,
          completed_at: new Date().toISOString()
        });
      }

      setChallenge(updatedChallenge);
      setCompletedQuestions(newCompleted);
      setFlag('');

      setTimeout(() => {
        if (newCompleted.length < SAMPLE_QUESTIONS.length) {
          localStorage.removeItem(`cybergauntlet_progress_${teamId}`);
          loadChallenge();
          setResult(null);
        }
      }, 3000);
    } else {
      setResult('incorrect');
      const updatedChallenge = { ...challenge, attempts: newAttempts };
      setChallenge(updatedChallenge);
      localStorage.setItem(`cybergauntlet_progress_${teamId}`, JSON.stringify({
        ...updatedChallenge,
        elapsedTime
      }));
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleDownload = () => {
    if (!question) return;
    const element = document.createElement('a');
    element.href = question.file_path;
    element.download = question.file_name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // const loadLeaderboard = async () => {
  //   try {
  //     const { data } = await supabase
  //       .from('leaderboard')
  //       .select('*')
  //       .order('time_spent', { ascending: true })
  //       .order('attempts', { ascending: true });
  //     setLeaderboardData(data || []);
  //   } catch (err) {
  //     console.error('Error loading leaderboard:', err);
  //   }
  // };

  const allQuestionsCompleted = completedQuestions.length === SAMPLE_QUESTIONS.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Terminal className="w-12 h-12 text-green-500" />
          </div>
          <p>Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (allQuestionsCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center p-4">
        <div className="scanlines"></div>
        <div className="relative z-10 max-w-md text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-4 text-green-500">ALL CHALLENGES COMPLETED</h1>
            <p className="text-green-300/80 mb-6">
              Congratulations! You've successfully completed all security challenges.
            </p>
            <p className="text-green-300/60 text-sm mb-6">
              Check the leaderboard to see your final standings.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="bg-green-600 hover:bg-green-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
          >
            LOGOUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono">
      <div className="scanlines"></div>
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              <GlitchText text="CYBER" className="text-green-500" />
              <span className="text-green-400">GAUNTLET</span>
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 px-4 py-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-green-300/80 text-sm">
                <span className="text-green-300/60">Team:</span>{" "}
                <span className="font-semibold">{teamName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-green-300/80 text-sm">
                <span className="text-green-300/60">Leader:</span>{" "}
                <span className="font-semibold">{leaderName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400/50 rounded-full"></div>
              <p className="text-green-300/80 text-sm">
                <span className="text-green-300/60">Progress:</span>{" "}
                <span className="font-semibold">{completedQuestions.length}</span>
                <span className="text-green-300/60">/{SAMPLE_QUESTIONS.length} completed</span>
              </p>
            </div>
          </div>
        </header>
        {/* <button
              onClick={() => {
                setShowLeaderboard(!showLeaderboard);
                if (!showLeaderboard) loadLeaderboard();
              }}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded transition-all text-sm"
            >
              <Trophy className="w-4 h-4" />
              LEADERBOARD
            </button> */}
        {/* <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              LOGOUT
            </button> */}
        {/* {showLeaderboard && (
          <div className="mb-6">
            <TerminalBox title="leaderboard.sh">
              {leaderboardData.length === 0 ? (
                <div className="text-center text-green-300/60">No scores yet</div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded text-sm ${
                        entry.team_name === teamName
                          ? 'bg-green-500/20 border border-green-500'
                          : 'bg-black/30 border border-green-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-orange-600 text-black' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-green-400 font-bold">{entry.team_name}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-green-400 font-mono">{formatTime(entry.time_spent)}</p>
                        <p className="text-green-300/60">{entry.attempts} attempts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerminalBox>
          </div>
        )} */}

        <div className="space-y-6">
          <TerminalBox title={`challenge_${question?.id}.sh`}>
            <div className="space-y-4 text-green-300">
              <div>
                <h2 className="text-2xl text-green-400 mb-2">{question?.title}</h2>
                <p className="text-green-300/80 leading-relaxed">{question?.description}</p>
              </div>

              <div className="border-t border-green-500/20 pt-4">
                <h3 className="text-green-400 mb-2">HINTS:</h3>
                <ul className="space-y-1 text-green-300/60 ml-4 text-sm">
                  {question?.hints.map((hint, idx) => (
                    <li key={idx}>→ {hint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TerminalBox>

          {question?.file_name && question?.file_path && (
            <TerminalBox title="download.sh">
              <div className="text-center">
                <button
                  onClick={handleDownload}
                  disabled={challenge?.completed}
                  className="inline-flex items-center gap-3 bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500 text-green-400 px-8 py-4 rounded-lg font-bold text-lg transition-all hover:shadow-lg hover:shadow-green-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-6 h-6" />
                  DOWNLOAD CHALLENGE FILE
                </button>
                <p className="text-green-300/50 text-xs mt-3">{question.file_name}</p>
              </div>
            </TerminalBox>
          )}

          <TerminalBox title="flag_submission.sh">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(elapsedTime)}</span>
                </div>
                <div className="text-green-300/60">
                  Attempts: <span className="text-green-400 font-bold">{challenge?.attempts || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-green-400 mb-2 text-sm">ENTER FLAG:</label>
                <input
                  type="text"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="CG{...}"
                  disabled={challenge?.completed}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={challenge?.completed}
                className="w-full bg-green-600 hover:bg-green-700 text-black font-bold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Terminal className="w-5 h-5" />
                {challenge?.completed ? 'NEXT CHALLENGE →' : 'VERIFY FLAG'}
              </button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border-2 flex items-center gap-3 animate-fade-in ${result === 'correct'
                  ? 'bg-green-500/10 border-green-500 text-green-400'
                  : 'bg-red-500/10 border-red-500 text-red-400'
                }`}>
                {result === 'correct' ? (
                  <>
                    <CheckCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold">ACCESS GRANTED!</p>
                      <p className="text-sm opacity-80">
                        Flag verified. Loading next challenge...
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold">ACCESS DENIED</p>
                      <p className="text-sm opacity-80">Incorrect flag. Keep analyzing...</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </TerminalBox>
        </div>
      </div>
    </div>
  );
}
