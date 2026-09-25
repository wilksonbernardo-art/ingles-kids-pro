import { Lock, X, Check, Star, Award, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Profile, QuestSubmission } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type ParentAreaProps = {
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  onProfilesChanged: () => void;
};

const PARENT_PIN = '1234';

export default function ParentArea({ open, onClose, profiles, onProfilesChanged }: ParentAreaProps) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [quests, setQuests] = useState<QuestSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [bonusProfile, setBonusProfile] = useState<string>('');
  const [bonusPoints, setBonusPoints] = useState<number>(10);
  const [bonusReason, setBonusReason] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (unlocked) loadQuests();
  }, [unlocked]);

  async function loadQuests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('quest_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setQuests(data as QuestSubmission[]);
    setLoading(false);
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === PARENT_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('PIN errado! Tenta novamente.');
      setPin('');
    }
  }

  async function approveQuest(quest: QuestSubmission) {
    const { error: updateError } = await supabase
      .from('quest_submissions')
      .update({ status: 'approved' })
      .eq('id', quest.id);
    if (updateError) return;

    const profile = profiles.find((p) => p.id === quest.profile_id);
    if (profile) {
      const newStars = profile.stars + quest.points;
      await supabase.from('profiles').update({ stars: newStars }).eq('id', quest.id);
    }

    setQuests((prev) => prev.filter((q) => q.id !== quest.id));
    onProfilesChanged();
    setFeedback(`Missão aprovada! +${quest.points} pontos para ${quest.profile_name} 🎉`);
    setTimeout(() => setFeedback(''), 3000);
  }

  async function rejectQuest(quest: QuestSubmission) {
    await supabase.from('quest_submissions').update({ status: 'rejected' }).eq('id', quest.id);
    setQuests((prev) => prev.filter((q) => q.id !== quest.id));
    setFeedback('Missão recusada.');
    setTimeout(() => setFeedback(''), 3000);
  }

  async function grantBonus() {
    if (!bonusProfile) return;
    const profile = profiles.find((p) => p.id === bonusProfile);
    if (!profile) return;
    const newStars = profile.stars + bonusPoints;
    const { error } = await supabase.from('profiles').update({ stars: newStars }).eq('id', profile.id);
    if (!error) {
      setBonusReason('');
      onProfilesChanged();
      setFeedback(`+${bonusPoints} pontos bónus para ${profile.name}!`);
      setTimeout(() => setFeedback(''), 3000);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <h2 className="text-lg font-bold">Área dos Pais</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-xl p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!unlocked ? (
            <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-4 py-8">
              <Lock className="w-12 h-12 text-indigo-400" />
              <p className="text-gray-600 text-center">Introduz o PIN para entrar</p>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                inputMode="numeric"
                className="w-32 text-center text-2xl tracking-[0.5em] font-bold rounded-2xl border-2 border-gray-200 focus:border-indigo-500 outline-none py-3"
                placeholder="••••"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
              <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition-all">
                Entrar
              </button>
              <p className="text-xs text-gray-400">PIN de demonstração: 1234</p>
            </form>
          ) : (
            <div className="space-y-6">
              {feedback && (
                <div className="bg-green-100 text-green-700 font-bold rounded-2xl px-4 py-3 text-center">
                  {feedback}
                </div>
              )}

              {/* Bonus Points */}
              <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200">
                <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 fill-current" />
                  Pontos Bónus
                </h3>
                <div className="space-y-2">
                  <select
                    value={bonusProfile}
                    onChange={(e) => setBonusProfile(e.target.value)}
                    className="w-full rounded-xl border-2 border-amber-200 px-3 py-2 outline-none focus:border-amber-400"
                  >
                    <option value="">Escolhe a criança...</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(Number(e.target.value))}
                      min={1}
                      max={500}
                      className="w-24 rounded-xl border-2 border-amber-200 px-3 py-2 outline-none focus:border-amber-400 text-center font-bold"
                    />
                    <input
                      type="text"
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      placeholder="Motivo (opcional)"
                      className="flex-1 rounded-xl border-2 border-amber-200 px-3 py-2 outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={grantBonus}
                      disabled={!bonusProfile}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold px-4 rounded-xl transition-all"
                    >
                      <Award className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Quests */}
              <div>
                <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Missões a Aguardar Aprovação
                </h3>
                {loading ? (
                  <p className="text-gray-400 text-center py-4">A carregar...</p>
                ) : quests.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 bg-gray-50 rounded-2xl">
                    Não há missões a aguardar aprovação 🎉
                  </p>
                ) : (
                  <div className="space-y-2">
                    {quests.map((q) => (
                      <div key={q.id} className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl">{q.quest_emoji}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-700 truncate">{q.quest_title}</p>
                            <p className="text-xs text-gray-400">
                              {q.profile_name} • {new Date(q.created_at).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                          <span className="bg-amber-100 text-amber-700 font-bold text-sm px-2 py-1 rounded-xl whitespace-nowrap">
                            +{q.points}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => approveQuest(q)}
                            className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-2 transition-all"
                            title="Aprovar"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => rejectQuest(q)}
                            className="bg-red-400 hover:bg-red-500 text-white rounded-xl p-2 transition-all"
                            title="Recusar"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
