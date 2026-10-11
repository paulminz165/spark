'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Calendar, ArrowRight } from 'lucide-react';

interface ProfileSetupProps {
  userId: string;
  
  onComplete: () => void;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const DIET_OPTIONS = ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Eggetarian', 'No preference'];
const RELATIONSHIP_GOALS = ['Serious relationship', 'Casual dating', 'Friends first', 'Figuring it out'];

export default function ProfileSetup({ userId,onComplete }: ProfileSetupProps) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [diet, setDiet] = useState('');
  const [smoker, setSmoker] = useState<boolean | null>(null);
  const [relationshipGoal, setRelationshipGoal] = useState('');
  const [prefGender, setPrefGender] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePrefGender = (g: string) => {
    setPrefGender((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleSubmit = async () => {
    if (!name || !dob || !gender) {
      setError('Name, date of birth, and gender are required');
      return;
    }

    setLoading(true);
    setError('');

    // const { error: updateError } = await supabase
    //   .from('profiles')
    //   .update({
    //     name,
    //     date_of_birth: dob,
    //     gender,
    //     bio,
    //     diet: diet || null,
    //     smoker,
    //     relationship_goal: relationshipGoal || null,
    //     pref_gender: prefGender.length > 0 ? prefGender : null,
    //     pref_age_min: 18,
    //     pref_age_max: 30,
    //   })
    //   .eq('id', userId);
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || '';
        const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        date_of_birth: dob,
        gender,
        bio,
        diet: diet || null,
        smoker,
        relationship_goal: relationshipGoal || null,
        pref_gender: prefGender.length > 0 ? prefGender : null,
        pref_age_min: 18,
        pref_age_max: 30,
      });
      

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onComplete();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl mb-1">About you</h1>
        <p className="text-neutral-400 text-sm">
          The basics — this helps us find your people
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          Name (as you'd like to appear)
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="w-full bg-surface-raised border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-spark-500/50"
          />
        </div>
      </div>

      {/* Date of birth */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          Date of birth
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full bg-surface-raised border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-spark-500/50 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`py-2.5 px-4 rounded-xl text-sm border transition-colors ${
                gender === g
                  ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                  : 'border-neutral-800 bg-surface-raised text-neutral-300 hover:border-neutral-700'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Who are you interested in? */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          Interested in (select all that apply)
        </label>
        <div className="flex gap-2 flex-wrap">
          {['Male', 'Female', 'Non-binary', 'Everyone'].map((g) => (
            <button
              key={g}
              onClick={() => {
                if (g === 'Everyone') {
                  setPrefGender(['Male', 'Female', 'Non-binary']);
                } else {
                  togglePrefGender(g);
                }
              }}
              className={`py-2 px-4 rounded-full text-sm border transition-colors ${
                g === 'Everyone'
                  ? prefGender.length === 3
                    ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                    : 'border-neutral-800 bg-surface-raised text-neutral-300'
                  : prefGender.includes(g)
                    ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                    : 'border-neutral-800 bg-surface-raised text-neutral-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Diet */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">Diet</label>
        <div className="flex gap-2 flex-wrap">
          {DIET_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDiet(d)}
              className={`py-2 px-4 rounded-full text-sm border transition-colors ${
                diet === d
                  ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                  : 'border-neutral-800 bg-surface-raised text-neutral-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Smoker */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          Do you smoke?
        </label>
        <div className="flex gap-2">
          {[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setSmoker(value)}
              className={`py-2 px-6 rounded-full text-sm border transition-colors ${
                smoker === value
                  ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                  : 'border-neutral-800 bg-surface-raised text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Relationship goal */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          What are you looking for?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RELATIONSHIP_GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => setRelationshipGoal(goal)}
              className={`py-2.5 px-4 rounded-xl text-sm border transition-colors ${
                relationshipGoal === goal
                  ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                  : 'border-neutral-800 bg-surface-raised text-neutral-300'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1.5">
          Bio (optional — keep it real)
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Chai > coffee. Will debate this."
          maxLength={200}
          rows={3}
          className="w-full bg-surface-raised border border-neutral-800 rounded-xl py-3 px-4 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-spark-500/50 resize-none"
        />
        <p className="text-xs text-neutral-600 mt-1">{bio.length}/200</p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-spark-500 hover:bg-spark-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? 'Saving...' : 'Next: Pick your interests'}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
