import { useState, useEffect, useCallback, useRef } from 'react';
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

  const isFetchingProfile = useRef(false);

  // Carregar módulos
  const loadModules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('module_order', { ascending: true });

      if (!error && data) {
        setModules(data as Module[]);
      }
    } catch (err) {
      console.error('Erro ao buscar modulos:', err);
    }
  }, []);

  // Buscar perfil existente no banco
  const fetchProfileForUser = useCallback(async (userId: string, userMeta?: any) => {
    if (isFetchingProfile.current) return null;
    isFetchingProfile.current = true;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveProfile(data as Profile);
        return data as Profile;
      }

      // Se não achou com esse id, busca o primeiro perfil que existir no banco
      const { data: anyProfile } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (anyProfile) {
        setActiveProfile(anyProfile as Profile);
        return anyProfile as Profile;
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      isFetchingProfile.current = false;
    }
    return null;
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    await fetchProfileForUser(session.user.id, session.user.user_metadata);
  }, [session, fetchProfileForUser]);

  // Inicialização rápida sem travar
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session: curSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(curSession);

        if (curSession?.user) {
          fetchProfileForUser(curSession.user.id, curSession.user.user_metadata);
          loadModules();
        } else {
          loadModules();
        }
      } catch (e) {
        console.error('Erro na inicializacao:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);

      if (newSession?.user) {
        fetchProfileForUser(newSession.user.id, newSession.user.user_metadata);
      } else {
        setActiveProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser, loadModules]);

  // Checagem de conclusão diária
  const checkTodayProgress = useCallback(async (profileId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const isDailyLocal = localStorage.getItem(`daily_done_${profileId}_${todayStr}`);
      if (isDailyLocal === 'true') {
        setTodayCompleted(true);
        return;
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('completed_at, created_at, status')
        .or(`profile_id.eq.${profileId},user_id.eq.${profileId}`);

      if (!error && data && data.length > 0) {
        const doneToday = data.some((item) => {
          const isDone = item.status === 'completed' || !!item.completed_at;
          const dt = (item.completed_at || item.created_at || '').split('T')[0];
          return isDone && dt === todayStr;
        });

        if (doneToday) {
          setTodayCompleted(true);
          try {
            localStorage.setItem(`daily_done_${profileId}_${todayStr}`, 'true');
          } catch {}
          return;
        }
      }
      setTodayCompleted(false);
    } catch {
      setTodayCompleted(false);
    }
  }, []);

  // Perfil que será usado na tela inteira (nunca é nulo enquanto estiver logado)
  const currentProfile: Profile = activeProfile || {
    id: session?.user?.id || 'perfil-padrao',
    name: session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Aventureiro',
    age: 7,
    avatar: '🦁',
    stars: 0,
  };

  useEffect(() => {
    if (currentProfile?.id) {
      checkTodayProgress(currentProfile.id);
    }
  }, [currentProfile?.id, checkTodayProgress]);

  // Logout
  async function handleLogoutAccount() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('auth-token')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
    setSession(null);
    setActiveProfile(null);
    setView({ name: 'trail' });
    setLoading(false);
  }

  // Atualizar avatar
  async function handleAvatarUpdated(newAvatar: string) {
    setActiveProfile({ ...currentProfile, avatar: newAvatar });

    try {
      await supabase
        .from('profiles')
        .update({ avatar: newAvatar })
        .eq('id', currentProfile.id);
    } catch (e) {
      console.error('Erro ao salvar avatar:', e);
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

  // Se estiver na tela de loading inicial antes de ler a sessão
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

  // Não logado -> Tela de login
  if (!session) {
    return (
      <AuthModal
        onSuccess={async () => {
          setLoading(true);
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession?.user) {
            setSession(newSession);
            await fetchProfileForUser(newSession.user.id, newSession.user.user_metadata);
          }
          setLoading(false);
        }}
      />
    );
  }

  // LOGADO: Entra direto na tela principal (sem nenhuma tela de espera intermediária)
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50 pb-32 sm:pb-24">
      <TopBar
        profiles={[currentProfile]}
        activeProfileId={currentProfile.id}
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
                    <span className="select-none">{currentProfile.avatar || '🦁'}</span>
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-0.5 rounded-full text-[8px]">
                      ✏️
                    </span>
                  </button>
                  <div>
                    <h4 className="font-black text-slate-800 text-xs leading-tight">
                      {currentProfile.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      ⭐ {currentProfile.stars} estrelas
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

              <LeaderboardCard currentProfileId={currentProfile.id} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {view.name === 'lessons' && (
              <ModuleLessons
                module={view.module}
                profileId={currentProfile.id}
                onBack={() => setView({ name: 'trail' })}
                onStartLesson={handleStartLesson}
              />
            )}

            {view.name === 'lesson' && (
              <LessonRunner
                module={view.module}
                lessonDay={view.lessonDay}
                profileId={currentProfile.id}
                profileName={currentProfile.name}
                existingProgress={view.progress}
                onBack={() => setView({ name: 'lessons', module: view.module })}
                onComplete={() => {
                  setTodayCompleted(true);
                  checkTodayProgress(currentProfile.id);
                  setView({ name: 'trail' });
                }}
                onStarsUpdated={loadUserProfile}
                profileStars={currentProfile.stars}
              />
            )}

            {view.name === 'missions' && (
              <HomeMissions profile={currentProfile} onProfilesChanged={loadUserProfile} />
            )}

            {view.name === 'playground' && (
              <Playground
                profileId={currentProfile.id}
                profileStars={currentProfile.stars}
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
        profileId={currentProfile.id}
        profileName={currentProfile.name}
        isOpen={badgesOpen}
        onClose={() => setBadgesOpen(false)}
      />

      <AvatarPickerModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={currentProfile.avatar || '🦁'}
        profileId={currentProfile.id}
        onAvatarUpdated={handleAvatarUpdated}
      />

      <ParentArea
        open={parentOpen}
        onClose={() => setParentOpen(false)}
        profiles={[currentProfile]}
        onProfilesChanged={loadUserProfile}
        onLogoutAccount={handleLogoutAccount}
      />
    </div>
  );
}