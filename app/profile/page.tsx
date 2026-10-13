'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Flame, ChevronRight, LogOut, Heart, Pencil, Check, X, Eye } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  bio: string;
  gender: string;
  date_of_birth: string;
  relationship_goal: string;
  diet: string;
  program: string;
  department: string;
  pref_gender: string[];
  pref_age_min: number;
  pref_age_max: number;
}

interface Interest {
  id: string;
  name: string;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary'];
const RELATIONSHIP_GOALS = ['Long-term', 'Short-term', 'Friendship', 'Figuring out'];
const DIET_OPTIONS = ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Eggetarian', 'No preference'];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [editSection, setEditSection] = useState<'none' | 'profile' | 'preferences'>('none');

  // Profile fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [relationshipGoal, setRelationshipGoal] = useState('');
  const [diet, setDiet] = useState('');

  // Preference fields
  const [prefGender, setPrefGender] = useState<string[]>([]);
  const [prefAgeMin, setPrefAgeMin] = useState(18);
  const [prefAgeMax, setPrefAgeMax] = useState(30);

  // Interests
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [myInterestIds, setMyInterestIds] = useState<string[]>([]);
  const [myInterestNames, setMyInterestNames] = useState<string[]>([]);
  const [editingInterests, setEditingInterests] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/auth');
          return;
        }

        const uid = session.user.id;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single();

        if (profileData) {
          setProfile(profileData);
          setName(profileData.name || '');
          setBio(profileData.bio || '');
          setGender(profileData.gender || '');
          setDob(profileData.date_of_birth || '');
          setRelationshipGoal(profileData.relationship_goal || '');
          setDiet(profileData.diet || '');
          setPrefGender(profileData.pref_gender || []);
          setPrefAgeMin(profileData.pref_age_min || 18);
          setPrefAgeMax(profileData.pref_age_max || 30);
        }

        // Load all interests
        const { data: interests } = await supabase
          .from('interests')
          .select('id, name')
          .order('name');

        if (interests) setAllInterests(interests);

        // Load my interests
        const { data: myInterests } = await supabase
          .from('user_interests')
          .select('interest_id, interests(name)')
          .eq('user_id', uid);

        if (myInterests) {
          setMyInterestIds(myInterests.map((i) => i.interest_id));
          setMyInterestNames(myInterests.map((i: any) => i.interests?.name).filter(Boolean));
        }
      } catch (err) {
        console.error('Profile init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({
          name,
          bio,
          gender,
          date_of_birth: dob,
          relationship_goal: relationshipGoal,
          diet,
        })
        .eq('id', profile.id);

      setProfile((prev) => prev ? { ...prev, name, bio, gender, date_of_birth: dob, relationship_goal: relationshipGoal, diet } : prev);
      setEditSection('none');
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({
          pref_gender: prefGender,
          pref_age_min: prefAgeMin,
          pref_age_max: prefAgeMax,
        })
        .eq('id', profile.id);

      setProfile((prev) => prev ? { ...prev, pref_gender: prefGender, pref_age_min: prefAgeMin, pref_age_max: prefAgeMax } : prev);
      setEditSection('none');
    } catch (err) {
      console.error('Save preferences error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = async (interestId: string) => {
    if (!profile) return;

    const interest = allInterests.find((i) => i.id === interestId);

    if (myInterestIds.includes(interestId)) {
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', profile.id)
        .eq('interest_id', interestId);

      setMyInterestIds((prev) => prev.filter((id) => id !== interestId));
      setMyInterestNames((prev) => prev.filter((n) => n !== interest?.name));
    } else {
      await supabase
        .from('user_interests')
        .insert({ user_id: profile.id, interest_id: interestId });

      setMyInterestIds((prev) => [...prev, interestId]);
      if (interest) setMyInterestNames((prev) => [...prev, interest.name]);
    }
  };

  const togglePrefGender = (g: string) => {
    setPrefGender((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const age = profile?.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Flame className="w-8 h-8 text-spark-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 pt-8 pb-6">
        <h1 className="font-serif text-3xl italic text-spark-400 mb-1">Profile</h1>
        <p className="text-sm text-neutral-500">Manage your profile and preferences</p>
      </div>

      {/* Profile Header — tap avatar for preview */}
      <div className="px-6 mb-6">
        <div className="bg-surface-raised border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPreview(true)}
              className="relative w-16 h-16 rounded-full bg-gradient-to-br from-spark-500/30 to-spark-700/30 flex items-center justify-center group"
            >
              <span className="text-2xl font-serif font-bold text-spark-400">
                {profile?.name?.charAt(0)?.toUpperCase()}
              </span>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-5 h-5 text-white" />
              </div>
            </button>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">
                {profile?.name}
                {age && <span className="text-neutral-500 font-normal">, {age}</span>}
              </h2>
              <p className="text-sm text-neutral-500">
                {[profile?.program, profile?.department].filter(Boolean).join(' · ') || 'IIT Delhi'}
              </p>
              {profile?.bio && (
                <p className="text-xs text-neutral-400 mt-1 line-clamp-1">&quot;{profile.bio}&quot;</p>
              )}
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="text-xs text-spark-400 flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>
        </div>
      </div>

      {/* Profile Preview Overlay */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs text-neutral-500">This is how others see you</p>
              <button onClick={() => setShowPreview(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface-raised border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-spark-500/20 to-spark-700/20 h-32 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-serif font-bold text-spark-400">
                    {profile?.name?.charAt(0)?.toUpperCase()}
                  </p>
                  <p className="text-xs text-spark-400/60 mt-1">Compatibility over looks</p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="font-semibold text-xl">
                    {profile?.name}
                    {age && <span className="text-neutral-500 font-normal">, {age}</span>}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    {[profile?.program, profile?.department].filter(Boolean).join(' · ') || 'IIT Delhi'}
                  </p>
                </div>

                {profile?.bio && (
                  <p className="text-sm text-neutral-300 mb-4">&quot;{profile.bio}&quot;</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {profile?.relationship_goal && (
                    <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                      {profile.relationship_goal}
                    </span>
                  )}
                  {profile?.diet && (
                    <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                      {profile.diet}
                    </span>
                  )}
                </div>

                {myInterestNames.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-neutral-500 mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {myInterestNames.map((interest) => (
                        <span key={interest} className="text-xs bg-spark-500/10 text-spark-400 px-2.5 py-1 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {myInterestNames.length === 0 && (
                  <p className="text-xs text-neutral-600 mb-2">No interests added yet</p>
                )}
              </div>
            </div>

            <button
              onClick={() => { setShowPreview(false); setEditSection('profile'); }}
              className="w-full mt-3 border border-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl hover:bg-neutral-800 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Section */}
      <div className="px-6 mb-3">
        <button
          onClick={() => setEditSection(editSection === 'profile' ? 'none' : 'profile')}
          className="w-full bg-surface-raised border border-neutral-800 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-spark-500/10 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-spark-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">Edit Profile</p>
              <p className="text-xs text-neutral-500">Name, bio, diet, goals</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-neutral-500 transition-transform ${editSection === 'profile' ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {editSection === 'profile' && (
        <div className="px-6 mb-3">
          <div className="bg-surface-raised border border-neutral-800 rounded-2xl p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0F0F1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spark-500 transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full bg-[#0F0F1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spark-500 transition-colors resize-none"
              />
              <p className="text-xs text-neutral-600 text-right">{bio.length}/200</p>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs text-neutral-500 mb-2 block">Gender</label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      gender === g
                        ? 'bg-spark-500/20 border-spark-500 text-spark-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-[#0F0F1A] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-spark-500 transition-colors"
              />
            </div>

            {/* Relationship Goal */}
            <div>
              <label className="text-xs text-neutral-500 mb-2 block">Looking for</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setRelationshipGoal(goal)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      relationshipGoal === goal
                        ? 'bg-spark-500/20 border-spark-500 text-spark-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* Diet */}
            <div>
              <label className="text-xs text-neutral-500 mb-2 block">Diet</label>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiet(d)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      diet === d
                        ? 'bg-spark-500/20 border-spark-500 text-spark-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 bg-spark-500 hover:bg-spark-400 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditSection('none')}
                className="px-6 border border-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Preferences Section */}
      <div className="px-6 mb-3">
        <button
          onClick={() => setEditSection(editSection === 'preferences' ? 'none' : 'preferences')}
          className="w-full bg-surface-raised border border-neutral-800 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-peach-400/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-peach-400" />
            </div>
            <div className="text-left">
              <p className="font-medium">Match Preferences</p>
              <p className="text-xs text-neutral-500">Who you want to see</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-neutral-500 transition-transform ${editSection === 'preferences' ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {editSection === 'preferences' && (
        <div className="px-6 mb-3">
          <div className="bg-surface-raised border border-neutral-800 rounded-2xl p-5 space-y-5">
            {/* Interested In */}
            <div>
              <label className="text-xs text-neutral-500 mb-2 block">Show me</label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => togglePrefGender(g)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      prefGender.includes(g)
                        ? 'bg-peach-400/20 border-peach-400 text-peach-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {prefGender.length === 0 && (
                <p className="text-xs text-neutral-600 mt-2">No filter — showing everyone</p>
              )}
            </div>

            {/* Age Range */}
            <div>
              <label className="text-xs text-neutral-500 mb-3 block">
                Age range: <span className="text-white font-medium">{prefAgeMin} – {prefAgeMax}</span>
              </label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-neutral-600 mb-1">
                    <span>Min age</span>
                    <span>{prefAgeMin}</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={35}
                    value={prefAgeMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPrefAgeMin(val);
                      if (val > prefAgeMax) setPrefAgeMax(val);
                    }}
                    className="w-full accent-spark-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-neutral-600 mb-1">
                    <span>Max age</span>
                    <span>{prefAgeMax}</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={35}
                    value={prefAgeMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPrefAgeMax(val);
                      if (val < prefAgeMin) setPrefAgeMin(val);
                    }}
                    className="w-full accent-spark-500"
                  />
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="flex-1 bg-spark-500 hover:bg-spark-400 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => setEditSection('none')}
                className="px-6 border border-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interests Section */}
      <div className="px-6 mb-3">
        <button
          onClick={() => setEditingInterests(!editingInterests)}
          className="w-full bg-surface-raised border border-neutral-800 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-spark-500/10 flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
            <div className="text-left">
              <p className="font-medium">Interests</p>
              <p className="text-xs text-neutral-500">{myInterestIds.length} selected</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-neutral-500 transition-transform ${editingInterests ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {editingInterests && (
        <div className="px-6 mb-3">
          <div className="bg-surface-raised border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs text-neutral-500 mb-3">Tap to add or remove interests</p>
            <div className="flex flex-wrap gap-2">
              {allInterests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    myInterestIds.includes(interest.id)
                      ? 'bg-spark-500/20 border-spark-500 text-spark-400'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  {interest.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-6 mt-4 mb-6">
        <button
          onClick={handleLogout}
          className="w-full bg-surface-raised border border-red-900/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-red-500/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-400" />
          </div>
          <p className="font-medium text-red-400">Log Out</p>
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}