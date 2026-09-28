import { useState, useEffect, useCallback } from 'react';
import { Map, Home, Award, LogOut, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Module, LessonProgress } from '@/lib/supabase';
import TopBar from '@/components/TopBar';
import ModuleTrail from '@/components/ModuleTrail';
import ModuleLessons from '@/components/ModuleLessons';
import LessonRunner from '@/components/LessonRunner';
import HomeMissions from '@/components/HomeMissions';
import ParentArea from '@/components/ParentArea';
import BadgesModal from '@/components/BadgesModal';
import AuthModal from '@/components/AuthModal';
import Playground from '@/components/Playground';
import LeaderboardCard from '@/components/LeaderboardCard';
import AvatarPickerModal from '@/components/AvatarPickerModal';

type View =
  | { name: 'trail' }
  | { name: 'lessons'; module: Module }
  | { name: 'lesson'; module: Module; lessonDay: number; progress: LessonProgress | null }
  | { name: 'missions' }
  | { name: 'playground' };

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [view, setView] = useState<View>({ name: 'trail' });
  const [parentOpen, setParentOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayCompleted, setTodayCompleted] = useState(false);

  // 1. Carregar módulos
  const loadModules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('module_order', { ascending: true });

      if (!error && data) setModules(data as Module[]);
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
    }
  }, []);

  // 2. Procurar ou criar perfil
  const fetchProfileForUser = useCallback(async (userId: string, userMeta?: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) console.error('Erro ao buscar perfil:', error);

      if (data && data.length > 0) {
        setActiveProfile(data[0] as Profile);
        return data[0] as Profile;
      }

      const defaultName =
        userMeta?.name ||
        userMeta?.email?.split('@')[0] ||
        'Aventureiro';

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          user_id: userId,
          name: defaultName,
          avatar: '🦁',
          stars: 0,
        })
        .select();

      if (!insertError && newProfile && newProfile.length > 0) {
        setActiveProfile(newProfile[0] as Profile);
        return newProfile[0] as Profile;
      }
    } catch (err) {
      console.error('Exceção ao obter perfil:', err);
    }
    return null;
  }, []);

  // 3. Recarregar os dados do perfil
  const loadUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    await fetchProfileForUser(session.user.id, session.user.user_metadata);
  }, [session, fetchProfileForUser]);

  // 4. Fluxo de carregamento e autenticação
  const refreshSessionAndData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        await Promise.all([
          fetchProfileForUser(currentSession.user.id, currentSession.user.user_metadata),
          loadModules(),
        ]);
      } else {
        await loadModules();
      }
    } catch (err) {
      console.error('Erro ao sincronizar sessão:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchProfileForUser, loadModules]);

  useEffect(() => {
    refreshSessionAndData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfileForUser(newSession.user.id, newSession.user.user_metadata);
      } else {
        setActiveProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSessionAndData, fetchProfileForUser]);

  // 5. Verificar progresso do dia
  const checkTodayProgress = useCallback(async (profileId: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('status, completed_at, created_at')
        .eq('profile_id', profileId)
        .eq('status', 'completed');

      if (!error && data && data.length > 0) {
        const hasDoneToday = data.some((item) => {
          const itemDate = (item.completed_at || item.created_at || '').split('T')[0];
          return itemDate === todayStr;
        });
        setTodayCompleted(hasDoneToday);
      } else {
        setTodayCompleted(false);
      }
    } catch (err) {
      console.error('Erro ao verificar progresso de hoje:', err);
      setTodayCompleted(false);
    }
  }, []);

  useEffect(() => {
    if (activeProfile?.id) {
      checkTodayProgress(activeProfile.id);
    }
  }, [activeProfile?.id, checkTodayProgress]);

  // 6. Função de Sair Definitiva
  async function handleLogoutAccount() {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('Erro ao efetuar logout:', err);
    } finally {
      setActiveProfile(null);
      setSession(null);
      setView({ name: 'trail' });
      window.location.reload();
    }
  }

  // 7. Atualizar Avatar na base de dados e no ecrã
  async function handleAvatarUpdated(newAvatar: string) {
    if (!activeProfile?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: newAvatar })
        .eq('id', activeProfile.id);

      if (!error) {
        setActiveProfile((prev) => (prev ? { ...prev, avatar: newAvatar } : null));
      }
    } catch (err) {
      console.error('Erro ao atualizar avatar:', err);
    }
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPlaygroundUnlocked = isWeekend || todayCompleted;

  function handleSelectModule(m: Module) {
    setView({ name: 'lessons', module: m });
  }

  function handleStartLesson(lessonDay: number) {
    if (view.name === 'lessons') {
      setView({ name: 'lesson', module: view.module, lessonDay, progress: null });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🦁</div>
          <p className="text-slate-500 font-bold mb-2">A carregar o English Kids...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthModal onSuccess={() => refreshSessionAndData()} />;
  }

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-6 rounded-3xl shadow-lg border border-slate-100 max-w-sm w-full">
          <div className="text-5xl animate-bounce mb-3">🦁</div>
          <p className="text-slate-700 font-bold text-sm mb-4">A preparar o teu perfil...</p>
          <button
            onClick={handleLogoutAccount}
            className="text-xs text-rose-500 font-bold underline cursor-pointer"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50 pb-24">
      <TopBar
        profiles={[activeProfile]}
        activeProfileId={activeProfile.id}
        onSelectProfile={() => {}}
        onOpenParentArea={() => setParentOpen(true)}
      />

      <main className="mt-4 max-w-7xl mx-auto px-4">
        {view.name === 'trail' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 w-full">
              <div
                onClick={() => {
                  if (isPlaygroundUnlocked) {
                    setView({ name: 'playground' });
                  }
                }}
                className={`rounded-3xl p-5 mb-6 transition-all ${
                  isPlaygroundUnlocked
                    ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg cursor-pointer hover:scale-101 active:scale-99'
                    : 'bg-white border-2 border-slate-200 text-slate-400 cursor-not-allowed opacity-80'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{isPlaygroundUnlocked ? '🎪' : '🔒'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black text-lg ${isPlaygroundUnlocked ? 'text-white' : 'text-slate-700'}`}>
                          Parque de Jogos (Treino Livre)
                        </h3>
                        {isWeekend ? (
                          <span className="bg-amber-300 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            Fim de Semana Livre
                          </span>
                        ) : todayCompleted ? (
                          <span className="bg-emerald-300 text-emerald-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                            Liberado Hoje
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-semibold mt-0.5">
                        {isWeekend
                          ? 'Acesso livre no fim de semana! Diverte-te com 6 joguinhos.'
                          : todayCompleted
                          ? 'Concluíste a lição de hoje! Joga à vontade.'
                          : 'Conclui a lição de hoje para desbloquear os minijogos!'}
                      </p>
                    </div>
                  </div>

                  {isPlaygroundUnlocked ? (
                    <span className="bg-white/20 text-white px-4 py-2 rounded-2xl font-black text-xs shrink-0">
                      Entrar ➔
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl shrink-0">
                      Bloqueado
                    </span>
                  )}
                </div>
              </div>

              <ModuleTrail modules={modules} onSelectModule={handleSelectModule} />
            </div>

            <div className="lg:col-span-4 w-full sticky top-4 space-y-3">
              <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-center text-2xl shadow-2xs cursor-pointer hover:scale-105 active:scale-95 transition-all relative"
                    title="Escolhe o teu avatar"
                  >
                    <span className="select-none">{activeProfile.avatar || '🦁'}</span>
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-0.5 rounded-full text-[8px]">
                      ✏️
                    </span>
                  </button>
                  <div>
                    <h4 className="font-black text-slate-800 text-xs leading-tight">
                      {activeProfile.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      ⭐ {activeProfile.stars} estrelas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                >
                  Avatar
                </button>
              </div>

              <LeaderboardCard currentProfileId={activeProfile.id} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {view.name === 'lessons' && (
              <ModuleLessons
                module={view.module}
                profileId={activeProfile.id}
                onBack={() => setView({ name: 'trail' })}
                onStartLesson={handleStartLesson}
              />
            )}

            {view.name === 'lesson' && (
              <LessonRunner
                module={view.module}
                lessonDay={view.lessonDay}
                profileId={activeProfile.id}
                profileName={activeProfile.name}
                existingProgress={view.progress}
                onBack={() => setView({ name: 'lessons', module: view.module })}
                onComplete={() => {
                  checkTodayProgress(activeProfile.id);
                  setView({ name: 'lessons', module: view.module });
                }}
                onStarsUpdated={loadUserProfile}
                profileStars={activeProfile.stars}
              />
            )}

            {view.name === 'missions' && (
              <HomeMissions profile={activeProfile} onProfilesChanged={loadUserProfile} />
            )}

            {view.name === 'playground' && (
              <Playground
                profileId={activeProfile.id}
                profileStars={activeProfile.stars}
                onBack={() => setView({ name: 'trail' })}
                onStarsUpdated={loadUserProfile}
              />
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-3xl border-t border-slate-100">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          <button
            onClick={() => setView({ name: 'trail' })}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
              view.name === 'trail'
                ? 'text-indigo-600 bg-indigo-50 font-black scale-105'
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px]">Módulos</span>
          </button>

          <button
            onClick={() => {
              if (isPlaygroundUnlocked) {
                setView({ name: 'playground' });
              }
            }}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              view.name === 'playground'
                ? 'text-purple-600 bg-purple-50 font-black scale-105'
                : isPlaygroundUnlocked
                ? 'text-purple-500 hover:text-purple-700 font-bold cursor-pointer'
                : 'text-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[11px]">{isPlaygroundUnlocked ? 'Jogos' : 'Bloqueado'}</span>
          </button>

          <button
            onClick={() => setBadgesOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-amber-500 hover:text-amber-600 font-bold transition-all cursor-pointer hover:bg-amber-50"
          >
            <Award className="w-5 h-5" />
            <span className="text-[11px]">Medalhas</span>
          </button>

          <button
            onClick={() => setView({ name: 'missions' })}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
              view.name === 'missions'
                ? 'text-rose-600 bg-rose-50 font-black scale-105'
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px]">Missões</span>
          </button>

          <button
            onClick={handleLogoutAccount}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-slate-400 hover:text-rose-500 font-bold transition-all cursor-pointer hover:bg-rose-50"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[11px]">Sair</span>
          </button>
        </div>
      </nav>

      <BadgesModal
        profileId={activeProfile.id}
        profileName={activeProfile.name}
        isOpen={badgesOpen}
        onClose={() => setBadgesOpen(false)}
      />

      <AvatarPickerModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={activeProfile.avatar || '🦁'}
        profileId={activeProfile.id}
        onAvatarUpdated={handleAvatarUpdated}
      />

      <ParentArea
        open={parentOpen}
        onClose={() => setParentOpen(false)}
        profiles={[activeProfile]}
        onProfilesChanged={loadUserProfile}
        onLogoutAccount={handleLogoutAccount}
      />
    </div>
  );
}