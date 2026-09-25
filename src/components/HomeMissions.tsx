import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { Profile, QuestSubmission } from '@/lib/supabase';
import { supabase, QUEST_DEFINITIONS } from '@/lib/supabase';

type HomeMissionsProps = {
  profile: Profile;
  onProfilesChanged: () => void;
};

export default function HomeMissions({ profile, onProfilesChanged }: HomeMissionsProps) {
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [profile.id]);

  async function loadSubmissions() {
    const { data } = await supabase
      .from('quest_submissions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setSubmissions(data as QuestSubmission[]);
  }

  async function submitQuest(questType: string, questTitle: string, questEmoji: string, points: number) {
    setSubmitting(questType);
    const { error } = await supabase.from('quest_submissions').insert({
      profile_id: profile.id,
      profile_name: profile.name,
      quest_type: questType,
      quest_title: questTitle,
      quest_emoji: questEmoji,
      points,
      status: 'pending',
    });
    if (!error) {
      setFeedback('Missão enviada! ⏳ À espera da aprovação do papá/mamã!');
      setTimeout(() => setFeedback(''), 4000);
      loadSubmissions();
      onProfilesChanged();
    }
    setSubmitting(null);
  }

  const recentSubmissions = submissions.slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800">Missões de Casa</h2>
        <p className="text-gray-500 mt-1">Completa as tuas missões e ganha pontos!</p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className="bg-amber-100 border-2 border-amber-300 text-amber-700 font-bold rounded-2xl px-4 py-3 text-center mb-6 animate-[fadeIn_0.3s_ease-in]">
          {feedback}
        </div>
      )}

      {/* Quest cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUEST_DEFINITIONS.map((quest) => {
          const alreadyPending = submissions.some(
            (s) => s.quest_type === quest.type && s.status === 'pending'
          );
          return (
            <button
              key={quest.type}
              onClick={() => submitQuest(quest.type, quest.title, quest.emoji, quest.points)}
              disabled={submitting === quest.type || alreadyPending}
              className={`group relative text-left rounded-3xl p-5 border-2 transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                alreadyPending
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl group-hover:scale-110 transition-transform">{quest.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-700 leading-tight">{quest.title}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="bg-amber-100 text-amber-700 font-bold text-sm px-2 py-1 rounded-xl">
                      +{quest.points} pts
                    </span>
                    {alreadyPending && (
                      <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent submissions */}
      {recentSubmissions.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-gray-600 mb-3">As tuas missões recentes</h3>
          <div className="space-y-2">
            {recentSubmissions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-2xl p-3 border-2 ${
                  s.status === 'pending'
                    ? 'bg-amber-50 border-amber-200'
                    : s.status === 'approved'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <span className="text-2xl">{s.quest_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-700 truncate">{s.quest_title}</p>
                  <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('pt-PT')}</p>
                </div>
                {s.status === 'pending' && (
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                    <Clock className="w-4 h-4" /> À espera
                  </span>
                )}
                {s.status === 'approved' && (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" /> +{s.points}
                  </span>
                )}
                {s.status === 'rejected' && (
                  <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" /> Recusado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
