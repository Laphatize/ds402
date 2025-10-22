'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [policyText, setPolicyText] = useState('');
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [ratings, setRatings] = useState({});
  const [showPreferences, setShowPreferences] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [liveStats, setLiveStats] = useState(null);

  const handleCreatePolicy = async () => {
    const topic = prompt('What should the policy be about?');
    if (!topic || !topic.trim()) return;

    setCreatingPolicy(true);
    setError('');
    setStatements([]);

    try {
      const res = await fetch('/api/generate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate policy');
      }

      setPolicyText(data.policyText || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingPolicy(false);
    }
  };

  const handleGenerate = async () => {
    if (!policyText.trim()) return;

    setLoading(true);
    setError('');
    setStatements([]);
    setRatings({});
    setShowPreferences(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate statements');
      }

      setStatements(data.statements || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (index, rating) => {
    setRatings(prev => ({
      ...prev,
      [index]: rating
    }));
  };

  const togglePreferences = () => {
    setShowPreferences(!showPreferences);
  };

  const getRatingPercentage = () => {
    const totalStatements = statements.length;
    const ratedCount = Object.keys(ratings).length;
    return totalStatements > 0 ? Math.round((ratedCount / totalStatements) * 100) : 0;
  };

  const getAverageRating = () => {
    const ratingValues = Object.values(ratings);
    if (ratingValues.length === 0) return 0;
    const sum = ratingValues.reduce((a, b) => a + b, 0);
    return (sum / ratingValues.length).toFixed(1);
  };

  const getMostAligned = () => {
    const entries = Object.entries(ratings);
    if (entries.length === 0) return null;
    const [index, rating] = entries.reduce((max, current) =>
      current[1] > max[1] ? current : max
    );
    return { index: parseInt(index), rating, statement: statements[index] };
  };

  const getLiveCompletion = () => {
    if (!liveStats || !liveStats.statementStats) return 0;
    const totalStatements = statements.length;
    const ratedStatements = Object.keys(liveStats.statementStats).length;
    return totalStatements > 0 ? Math.round((ratedStatements / totalStatements) * 100) : 0;
  };

  const getLiveAverageRating = () => {
    if (!liveStats || !liveStats.statementStats) return 0;
    const statsArray = Object.values(liveStats.statementStats);
    if (statsArray.length === 0) return 0;
    const totalAvg = statsArray.reduce((sum, stat) => sum + parseFloat(stat.average), 0);
    return (totalAvg / statsArray.length).toFixed(1);
  };

  const getLiveMostAligned = () => {
    if (!liveStats || !liveStats.statementStats) return null;
    const entries = Object.entries(liveStats.statementStats);
    if (entries.length === 0) return null;
    const [index, stats] = entries.reduce((max, current) =>
      parseFloat(current[1].average) > parseFloat(max[1].average) ? current : max
    );
    return { index: parseInt(index), rating: parseFloat(stats.average), statement: statements[index], count: stats.count };
  };

  const fetchLiveStats = async (sessionIdToFetch) => {
    try {
      const res = await fetch(`/api/sessions/${sessionIdToFetch}`);
      const data = await res.json();

      if (res.ok) {
        setLiveStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching live stats:', e);
    }
  };

  useEffect(() => {
    if (sessionId) {
      // Initial fetch
      fetchLiveStats(sessionId);

      // Poll every 5 seconds
      const interval = setInterval(() => {
        fetchLiveStats(sessionId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const handleCreateShareLink = async () => {
    if (statements.length === 0) return;

    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyText, statements }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create voting session');
      }

      const url = `${window.location.origin}/vote/${data.sessionId}`;
      setShareUrl(url);
      setSessionId(data.sessionId);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert(`Voting link created and copied to clipboard!\n\n${url}`);
    } catch (e) {
      setError(e.message);
      alert(`Error: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e8eaed]">
      <main className="max-w-[1000px] mx-auto px-5 py-5">
        <h1 className="text-[22px] mb-2.5">Policy → Generated Statements</h1>
        <p className="mb-4 text-sm text-[#b8babd]">
          Enter a policy text below, and the system will use an LLM to generate statements summarizing distinct perspectives, similar to the <em>Generative Social Choice</em> paper.
        </p>

        <div className="relative">
          <textarea
            id="policyInput"
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            placeholder="Type or paste your policy here..."
            className="w-full h-[180px] bg-[#11151c] text-[#e8eaed] border border-[#22293a] rounded-lg p-2.5 resize-none"
          />
          <button
            onClick={handleCreatePolicy}
            disabled={creatingPolicy}
            className="absolute top-2 right-2 bg-[#5f6368] hover:bg-[#7a7d82] text-white text-xs border-none px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Generate a policy from a topic"
          >
            {creatingPolicy ? '✨ Creating...' : '✨ Magic Policy Creator'}
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !policyText.trim()}
          className="bg-[#1a73e8] text-white border-none px-4 py-2.5 my-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1557b0] transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Statements'}
        </button>

        <section id="results">
          {error && (
            <p className="text-[#ff6b6b] mt-4">Error: {error}</p>
          )}

          {statements.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-6 mb-4 flex-wrap gap-2">
                <h3 className="text-lg">Generated Statements:</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateShareLink}
                    disabled={creating}
                    className="bg-[#34a853] hover:bg-[#2d8e44] text-white text-sm border-none px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? '🔗 Creating...' : '🔗 Share for Voting'}
                  </button>
                  <button
                    onClick={togglePreferences}
                    className="bg-[#2d333b] hover:bg-[#3d434b] text-white text-sm border-none px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    {showPreferences ? '📊 Hide Analysis' : '📊 Rate Statements'}
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#b8babd] mb-4">
                {showPreferences
                  ? 'Rate each statement from 1-5 based on how well it represents your view:'
                  : 'Click "Rate Statements" to provide your preferences (Discriminative Query Phase)'}
              </p>

              {statements.map((statement, i) => (
                <div
                  key={i}
                  className="bg-[#151a22] border border-[#22293a] rounded-lg p-2.5 mt-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <b>Statement {i + 1}</b>: {statement}
                    </div>
                    {showPreferences && (
                      <div className="flex gap-1 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => handleRating(i, rating)}
                            className={`w-8 h-8 rounded ${
                              ratings[i] === rating
                                ? 'bg-[#1a73e8] text-white'
                                : 'bg-[#22293a] text-[#8a8f98] hover:bg-[#2d333b]'
                            } transition-colors text-sm font-medium`}
                            title={`Rate ${rating}/5`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {showPreferences && Object.keys(ratings).length > 0 && (
                <div className="mt-6 bg-[#1a1f28] border border-[#2d333b] rounded-lg p-4">
                  <h4 className="text-base font-semibold mb-3">📈 Preference Analysis (Your Ratings)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1">Completion</div>
                      <div className="text-2xl font-bold text-[#1a73e8]">
                        {getRatingPercentage()}%
                      </div>
                      <div className="text-xs text-[#8a8f98] mt-1">
                        {Object.keys(ratings).length} of {statements.length} rated
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1">Average Rating</div>
                      <div className="text-2xl font-bold text-[#34a853]">
                        {getAverageRating()}/5
                      </div>
                      <div className="text-xs text-[#8a8f98] mt-1">
                        Overall representation quality
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1">Best Match</div>
                      <div className="text-2xl font-bold text-[#fbbc04]">
                        {getMostAligned() ? `#${getMostAligned().index + 1}` : 'N/A'}
                      </div>
                      <div className="text-xs text-[#8a8f98] mt-1">
                        {getMostAligned() ? `Rated ${getMostAligned().rating}/5` : 'Rate statements to see'}
                      </div>
                    </div>
                  </div>
                  {getMostAligned() && (
                    <div className="mt-4 p-3 bg-[#151a22] rounded-lg border-l-4 border-[#fbbc04]">
                      <div className="text-xs text-[#8a8f98] mb-1">Most Aligned Statement:</div>
                      <div className="text-sm">{getMostAligned().statement}</div>
                    </div>
                  )}
                </div>
              )}

              {liveStats && liveStats.voterCount > 0 && (
                <div className="mt-6 bg-[#1a1f28] border-2 border-[#34a853] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold">🌍 Live Voting Results</h4>
                    <div className="flex items-center gap-2 text-xs text-[#8a8f98]">
                      <div className="w-2 h-2 bg-[#34a853] rounded-full animate-pulse"></div>
                      Updates every 5s
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1 text-xs">Participants</div>
                      <div className="text-xl font-bold text-[#1a73e8]">
                        {liveStats.voterCount}
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1 text-xs">Total Votes</div>
                      <div className="text-xl font-bold text-[#34a853]">
                        {liveStats.totalVotes}
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1 text-xs">Completion</div>
                      <div className="text-xl font-bold text-[#1a73e8]">
                        {getLiveCompletion()}%
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1 text-xs">Avg Rating</div>
                      <div className="text-xl font-bold text-[#34a853]">
                        {getLiveAverageRating()}/5
                      </div>
                    </div>
                    <div className="bg-[#151a22] rounded-lg p-3">
                      <div className="text-[#8a8f98] mb-1 text-xs">Top Rated</div>
                      <div className="text-xl font-bold text-[#fbbc04]">
                        {getLiveMostAligned() ? `#${getLiveMostAligned().index + 1}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {getLiveMostAligned() && (
                    <div className="mb-4 p-3 bg-[#151a22] rounded-lg border-l-4 border-[#fbbc04]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-[#8a8f98]">Highest Rated Statement:</div>
                        <div className="text-xs text-[#fbbc04] font-semibold">
                          {getLiveMostAligned().rating.toFixed(2)}/5 ({getLiveMostAligned().count} votes)
                        </div>
                      </div>
                      <div className="text-sm">{getLiveMostAligned().statement}</div>
                    </div>
                  )}

                  {shareUrl && (
                    <div className="p-3 bg-[#151a22] rounded-lg border-l-4 border-[#1a73e8]">
                      <div className="text-xs text-[#8a8f98] mb-2">Share this link:</div>
                      <div className="text-sm font-mono break-all text-[#1a73e8]">{shareUrl}</div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          alert('Link copied to clipboard!');
                        }}
                        className="mt-2 text-xs bg-[#22293a] hover:bg-[#2d333b] px-3 py-1 rounded transition-colors"
                      >
                        📋 Copy Link
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <h5 className="text-sm font-semibold mb-2">Statement Ratings:</h5>
                    <div className="space-y-2">
                      {statements.map((statement, i) => {
                        const stats = liveStats.statementStats[i];
                        return stats ? (
                          <div key={i} className="bg-[#151a22] rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="text-xs font-semibold">Statement {i + 1}</div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-[#34a853] font-bold">
                                  Avg: {stats.average}/5
                                </span>
                                <span className="text-[#8a8f98]">
                                  ({stats.count} votes)
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-[#b8babd] line-clamp-2">{statement}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <p className='text-center'>&copy; Pranav Ramesh 2025</p>
    </div>
  );
}
