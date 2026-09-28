import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onSuccess: () => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSignUp) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Por favor, introduza o seu nome.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: trimmedName,
            },
          },
        });

        if (error) throw error;

        // Regista ou atualiza o perfil com o nome definido e pontuação inicial a zero
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            user_id: data.user.id,
            name: trimmedName,
            stars: 0,
            monthly_stars: 0,
            streak_days: 0,
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-sky-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 rounded-3xl flex items-center justify-center mx-auto mb-3 text-3xl shadow-inner">
            🦁
          </div>
          <h2 className="text-2xl font-black text-slate-800">English Kids Pro</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {isSignUp ? 'Crie uma conta para começar a jogar' : 'Inicie sessão para aceder às aulas'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-600 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-extrabold text-slate-600 mb-1">
                Nome da Criança
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como queres ser chamado?"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 text-sm font-semibold outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-600 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-600 mb-1">Palavra-passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A processar...' : isSignUp ? 'Criar Conta' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage('');
            }}
            className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
          >
            {isSignUp ? 'Já tem conta? Iniciar sessão' : 'Ainda não tem conta? Criar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}