'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function VotingPage() {
  const params = useParams();
  const sessionId = params.sessionId;

  const [session, setSession] = useState(null);
  const [ratings, setRatings] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voterId, setVoterId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Get or create voter ID
    let id = localStorage.getItem('voterId');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('voterId', id);
    }
    setVoterId(id);
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}?voterId=${voterId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch session');
      }

      setSession(data.session);
      setStats(data.stats);
      setRatings(data.voterVotes || {});
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (voterId) {
      fetchSession();
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchSession, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, voterId]);

  const handleRating = async (index, rating) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          voterId,
          statementIndex: index,
          rating
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      setRatings(prev => ({
        ...prev,
        [index]: rating
      }));

      // Refresh data immediately after voting
      await fetchSession();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCompletionPercentage = () => {
    if (!session) return 0;
    const ratedCount = Object.keys(ratings).length;
    return Math.round((ratedCount / session.statements.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e8eaed] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading voting session...</div>
          <div className="text-sm text-[#8a8f98]">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0d10] text-[#e8eaed] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-[#ff6b6b]">Error</div>
          <div className="text-sm text-[#8a8f98]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e8eaed]">
      <main className="max-w-[1000px] mx-auto px-5 py-5">
        <div className="mb-6">
          <h1 className="text-[22px] mb-2.5">Vote on Policy Statements</h1>
          <p className="text-sm text-[#b8babd] mb-4">
            Rate each statement based on how well it represents your view (1 = Not at all, 5 = Perfectly)
          </p>

          <div className="bg-[#151a22] border border-[#22293a] rounded-lg p-4 mb-4">
            <div className="text-xs text-[#8a8f98] mb-2">Policy Context:</div>
            <div className="text-sm">{session.policy_text}</div>
          </div>

          <div className="bg-[#1a1f28] border border-[#2d333b] rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Your Progress</div>
                <div className="text-xs text-[#8a8f98] mt-1">
                  {Object.keys(ratings).length} of {session.statements.length} statements rated
                </div>
              </div>
              <div className="text-2xl font-bold text-[#1a73e8]">
                {getCompletionPercentage()}%
              </div>
            </div>
            <div className="mt-2 h-2 bg-[#22293a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1a73e8] transition-all duration-300"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        <h3 className="text-lg mb-3">Statements to Rate:</h3>

        {session.statements.map((statement, i) => (
          <div
            key={i}
            className="bg-[#151a22] border border-[#22293a] rounded-lg p-4 mt-3"
          >
            <div className="mb-3">
              <b>Statement {i + 1}</b>: {statement}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => handleRating(i, rating)}
                    disabled={submitting}
                    className={`w-10 h-10 rounded ${
                      ratings[i] === rating
                        ? 'bg-[#1a73e8] text-white'
                        : 'bg-[#22293a] text-[#8a8f98] hover:bg-[#2d333b]'
                    } transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={`Rate ${rating}/5`}
                  >
                    {rating}
                  </button>
                ))}
              </div>

              {stats?.statementStats[i] && (
                <div className="text-sm text-[#8a8f98]">
                  Avg: <span className="text-[#34a853] font-semibold">
                    {stats.statementStats[i].average}
                  </span> ({stats.statementStats[i].count} votes)
                </div>
              )}
            </div>
          </div>
        ))}

        {stats && (
          <div className="mt-6 bg-[#1a1f28] border border-[#2d333b] rounded-lg p-4">
            <h4 className="text-base font-semibold mb-3">📊 Live Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#151a22] rounded-lg p-3">
                <div className="text-[#8a8f98] mb-1">Total Participants</div>
                <div className="text-2xl font-bold text-[#1a73e8]">
                  {stats.voterCount}
                </div>
              </div>
              <div className="bg-[#151a22] rounded-lg p-3">
                <div className="text-[#8a8f98] mb-1">Total Votes</div>
                <div className="text-2xl font-bold text-[#34a853]">
                  {stats.totalVotes}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <p className='text-center mt-8 mb-4'>&copy; Pranav Ramesh 2025</p>
    </div>
  );
}
