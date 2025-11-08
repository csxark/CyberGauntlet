import { useState, useEffect } from 'react';
import { Download, Terminal, CheckCircle, XCircle, Clock, LogOut, Trophy } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { TerminalBox } from './TerminalBox';
import { supabase } from '../lib/supabase';

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
  file_content: string;
  correct_flag: string;
  hints: string[];
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "SQL Injection Detection",
    description: "Identify the SQL injection vulnerability in the login form and extract the hidden flag.",
    file_name: "login_form.php",
    file_content: "PD9waHAKJHVzZXJuYW1lID0gJF9HRVRbJ3VzZXJuYW1lJ107CiRwYXNzd29yZCA9ICRfR0VUWydwYXNzd29yZCddOwokY29ubmVjdGlvbiA9IG5ldyBQRE8oJ215c3FsOmhvc3Q9bG9jYWxob3N0JywgJ3Jvb3QnLCAnJyk7CiRxdWVyeSA9ICJTRUxFQ1QgKiBGUk9NIHR1c2VycyBXSEVSRSB1c2VybmFtZSA9ICckdXNlcm5hbWUnIEFORCBwYXNzd29yZCA9ICckcGFzc3dvcmQnIjsK",
    correct_flag: "CG{SQL_INJECT_FOUND}",
    hints: ["Look at the query construction", "No prepared statements used", "User input directly in query"]
  },
  {
    id: "q2",
    title: "XSS Vulnerability",
    description: "Find the Cross-Site Scripting vulnerability and retrieve the admin session cookie.",
    file_name: "comments.js",
    file_content: "ZnVuY3Rpb24gcmVuZGVyQ29tbWVudChjb21tZW50KSB7CiAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7CiAgZGl2LmlubmVySFRNTCA9IGNvbW1lbnQ7CiAgcmV0dXJuIGRpdjsKfQ==",
    correct_flag: "CG{XSS_VULT_STORED}",
    hints: ["innerHTML is dangerous", "User input not sanitized", "Direct DOM manipulation"]
  },
  {
    id: "q3",
    title: "Authentication Bypass",
    description: "Analyze the authentication logic and find the bypass to access the admin panel.",
    file_name: "auth.py",
    file_content: "ZGVmIGF1dGhlbnRpY2F0ZSh1c2VyLCBwYXNzKToKICAgIGlmIHVzZXIgPT0gImFkbWluIiBhbmQgcGFzcyA9PSAiYWRtaW4xMjMiOgogICAgICAgIHJldHVybiBUcnVlCiAgICBlbGlmIHVzZXIgPT0gIioiOgogICAgICAgIHJldHVybiBUcnVlCiAgICByZXR1cm4gRmFsc2U=",
    correct_flag: "CG{WILDCARD_BYPASS}",
    hints: ["Check all conditions carefully", "Wildcard character found", "Logic error in auth"]
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

      await supabase.from('leaderboard').insert({
        team_name: teamName,
        question_id: question.id,
        time_spent: completedTime,
        attempts: newAttempts,
        completed_at: new Date().toISOString()
      });

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
    const file = new Blob([atob(question.file_content)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
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
              <p className="text-green-300/50 text-xs mt-3">{question?.file_name}</p>
            </div>
          </TerminalBox>

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
