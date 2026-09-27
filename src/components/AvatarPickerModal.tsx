import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playSuccessSound } from '@/lib/speech';

type AvatarPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  profileId: string;
  onAvatarUpdated: (newAvatar: string) => void;
};

type Category = 'boys' | 'girls' | 'creatures';

const AVATAR_COLLECTIONS: Record<Category, { label: string; icon: string; avatars: string[] }> = {
  boys: {
    label: 'Meninos',
    icon: '👦',
    avatars: ['👦', '🧑', '🧒', '👶', '🦸‍♂️', '🧙‍♂️', '🧑‍🚀', '🤴', '🤠', '🥷', '🕵️‍♂️', '👨‍🎤'],
  },
  girls: {
    label: 'Meninas',
    icon: '👧',
    avatars: ['👧', '👩', '🧒', '👶', '🦸‍♀️', '🧙‍♀️', '🧑‍🚀', '👸', '🧝‍♀️', '👩‍🎤', '🧚‍♀️', '👩‍🎨'],
  },
  creatures: {
    label: 'Mascotes',
    icon: '🐾',
    avatars: ['🦁', '🐯', '🐼', '🦊', '🦄', '🐲', '🐵', '🐰', '🦉', '🦖', '🤖', '👾'],
  },
};

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatar,
  profileId,
  onAvatarUpdated,
}: AvatarPickerModalProps) {
  const [category, setCategory] = useState<Category>('boys');
  const [selected, setSelected] = useState<string>(currentAvatar);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (avatar: string) => {
    setSelected(avatar);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar })
      .eq('id', profileId);

    if (!error) {
      playSuccessSound();
      onAvatarUpdated(avatar);
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{selected || '🎨'}</span>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Escolha seu Avatar</h3>
              <p className="text-xs font-semibold text-slate-400">Personalize seu visual no ranking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas de Gênero / Categoria */}
        <div className="grid grid-cols-3 gap-2 my-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          {(Object.keys(AVATAR_COLLECTIONS) as Category[]).map((catKey) => {
            const cat = AVATAR_COLLECTIONS[catKey];
            const isActive = category === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setCategory(catKey)}
                className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid dos Avatares */}
        <div className="grid grid-cols-4 gap-3 my-2 max-h-60 overflow-y-auto p-1">
          {AVATAR_COLLECTIONS[category].avatars.map((av, idx) => {
            const isCurrent = selected === av;
            return (
              <button
                key={idx}
                disabled={saving}
                onClick={() => handleSave(av)}
                className={`w-full aspect-square rounded-2xl flex items-center justify-center text-4xl border-2 transition-all cursor-pointer hover:scale-108 active:scale-95 ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-white hover:border-indigo-300'
                }`}
              >
                <span className="select-none">{av}</span>
              </button>
            );
          })}
        </div>

        {/* Rodapé informativo */}
        <p className="text-[11px] font-bold text-center text-slate-400 mt-4">
          Toque no avatar para aplicar imediatamente!
        </p>
      </div>
    </div>
  );
}