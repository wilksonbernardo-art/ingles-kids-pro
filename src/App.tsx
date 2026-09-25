import { useState, useEffect, useCallback } from 'react';
import { Map, Home, Award, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Module, LessonProgress } from '@/lib/supabase';
import TopBar from '@/components/TopBar';
import ModuleTrail from '@/components/ModuleTrail';
import ModuleLessons from '@/components/ModuleLessons';
import LessonRunner from '@/components/LessonRunner';
import HomeMissions from '@/components/HomeMissions';
import ParentArea from '@/components/ParentArea';
import BadgesModal from '@/components/BadgesModal';
import ProfileLogin from '@/components/ProfileLogin';
import AuthModal from '@/components/AuthModal';

type View =
  | { name: 'trail' }
  | { name: 'lessons'; module: Module }
  | { name: 'lesson'; module: Module; lessonDay: number; progress: LessonProgress | null }
  | { name: 'missions' };

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [view, setView] = useState<View>({ name: 'trail' });
  const [parentOpen, setParentOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Escutar estado de autenticação do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setActiveProfileId(null);
        setProfiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar perfis vinculados ao usuário autenticado
  const loadProfiles = useCallback(async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setProfiles(data as Profile[]);
    }
  }, [session]);

  // 3. Carregar os 12 módulos pedagógicos
  const loadModules = useCallback(async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('module_order', { ascending: true });

    if (!error && data) setModules(data as Module[]);
  }, []);

  useEffect(() => {
    (async () => {
      if (session) {
        await Promise.all([loadProfiles(), loadModules()]);
      } else {
        await loadModules();
      }
      setLoading(false);
    })();
  }, [session, loadProfiles, loadModules]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  function handleSelectProfile(id: string) {
    setActiveProfileId(id);
    setView({ name: 'trail' });
  }

  function handleSwitchProfile() {
    setActiveProfileId(null);
  }

  async function handleLogoutAccount() {
    await supabase.auth.signOut();
    setActiveProfileId(null);
    setSession(null);
  }

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
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🦁</div>
          <p className="text-slate-500 font-bold">A carregar o English Kids...</p>
        </div>
      </div>
    );
  }

  // Nível 1: Não autenticado -> Formulário de E-mail/Senha dos Pais
  if (!session) {
    return <AuthModal onSuccess={() => setLoading(true)} />;
  }

  // Nível 2: Pai autenticado, mas nenhuma criança selecionada -> Ecrã de Perfis
  if (!activeProfile) {
    return (
      <>
        <ProfileLogin
          profiles={profiles}
          onSelectProfile={handleSelectProfile}
          onOpenParentArea={() => setParentOpen(true)}
        />
        <ParentArea
          open={parentOpen}
          onClose={() => setParentOpen(false)}
          profiles={profiles}
          onProfilesChanged={loadProfiles}
          onLogoutAccount={handleLogoutAccount}
        />
      </>
    );
  }

  // Nível 3: Criança ativa -> Sala de aula e trilhas
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50 pb-20">
      <TopBar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={setActiveProfileId}
        onOpenParentArea={() => setParentOpen(true)}
      />

      <main className="mt-1">
        {view.name === 'trail' && <ModuleTrail modules={modules} onSelectModule={handleSelectModule} />}
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
            onComplete={() => setView({ name: 'lessons', module: view.module })}
            onStarsUpdated={loadProfiles}
            profileStars={activeProfile.stars}
          />
        )}
        {view.name === 'missions' && (
          <HomeMissions profile={activeProfile} onProfilesChanged={loadProfiles} />
        )}
      </main>

      {/* Navegação Inferior */}
      {(view.name === 'trail' || view.name === 'missions') && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-3xl border-t border-slate-100">
          <div className="max-w-md mx-auto flex items-center justify-around px-4 py-2">
            <button
              onClick={() => setView({ name: 'trail' })}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all cursor-pointer ${
                view.name === 'trail'
                  ? 'text-indigo-600 bg-indigo-50 font-black scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-bold'
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-xs">Módulos</span>
            </button>

            <button
              onClick={() => setBadgesOpen(true)}
              className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-amber-500 hover:text-amber-600 font-bold transition-all cursor-pointer hover:bg-amber-50"
            >
              <Award className="w-5 h-5" />
              <span className="text-xs">Medalhas</span>
            </button>

            <button
              onClick={() => setView({ name: 'missions' })}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all cursor-pointer ${
                view.name === 'missions'
                  ? 'text-rose-600 bg-rose-50 font-black scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-bold'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Missões</span>
            </button>

            <button
              onClick={handleSwitchProfile}
              className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-slate-400 hover:text-rose-500 font-bold transition-all cursor-pointer hover:bg-rose-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Trocar</span>
            </button>
          </div>
        </nav>
      )}

      {/* Modal de Conquistas */}
      <BadgesModal
        profileId={activeProfile.id}
        profileName={activeProfile.name}
        isOpen={badgesOpen}
        onClose={() => setBadgesOpen(false)}
      />

      {/* Área dos Pais */}
      <ParentArea
        open={parentOpen}
        onClose={() => setParentOpen(false)}
        profiles={profiles}
        onProfilesChanged={loadProfiles}
        onLogoutAccount={handleLogoutAccount}
      />
    </div>
  );
}