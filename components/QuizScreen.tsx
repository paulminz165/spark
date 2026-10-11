'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, Flame } from 'lucide-react';

interface QuizScreenProps {
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  dimension: string;
  options: { label: string; score: number }[];
}

export default function QuizScreen({ userId, onComplete, onBack }: QuizScreenProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (data) setQuestions(data);
      setLoading(false);
    };

    fetchQuestions();
  }, []);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (score: number) => {
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.id]: score };
    setAnswers(newAnswers);

    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Save individual responses
    const responses = Object.entries(answers).map(([questionId, score]) => ({
      user_id: userId,
      question_id: questionId,
      answer_score: score,
    }));

    await supabase.from('quiz_responses').upsert(responses, {
      onConflict: 'user_id,question_id',
    });

    // Calculate dimension scores
    const dimensionScores: Record<string, number[]> = {};
    questions.forEach((q) => {
      if (answers[q.id] !== undefined) {
        if (!dimensionScores[q.dimension]) dimensionScores[q.dimension] = [];
        dimensionScores[q.dimension].push(answers[q.id]);
      }
    });

    const avgScore = (scores: number[]) =>
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 3;

    const userScores = {
      user_id: userId,
      lifestyle_score: avgScore(dimensionScores.lifestyle || []),
      values_score: avgScore(dimensionScores.values || []),
      social_energy_score: avgScore(dimensionScores.social_energy || []),
      communication_score: avgScore(dimensionScores.communication || []),
    };

    await supabase.from('user_scores').upsert(userScores, {
      onConflict: 'user_id',
    });

    // Mark quiz as completed
    await supabase
      .from('profiles')
      .update({ quiz_completed: true })
      .eq('id', userId);

    setSubmitting(false);
    onComplete();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-spark-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allAnswered = Object.keys(answers).length === questions.length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex((i) => i - 1);
            } else {
              onBack();
            }
          }}
          className="text-neutral-400 hover:text-neutral-300 mb-4 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-serif text-3xl mb-1">The vibe check</h1>
        <p className="text-neutral-400 text-sm">
          {currentIndex + 1} of {questions.length} — answer honestly, not
          aspirationally
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-spark-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current question */}
      {currentQ && (
        <div className="space-y-4 pt-4">
          <div className="bg-surface-raised rounded-2xl p-6">
            <span className="text-xs uppercase tracking-wider text-spark-400 mb-2 block">
              {currentQ.dimension.replace('_', ' ')}
            </span>
            <h2 className="text-lg font-medium leading-relaxed">
              {currentQ.question_text}
            </h2>
          </div>

          {/* Options as a 1-5 scale */}
          <div className="space-y-2">
            {currentQ.options.map((opt: any, i: number) => {
              // Support both {score: number} and {scores: {dimension: number}} formats
              const optScore = opt.score ?? (opt.scores?.[currentQ.dimension] ?? (i + 1));
              const isSelected = answers[currentQ.id] === optScore;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(optScore)}
                  className={`w-full text-left py-3.5 px-4 rounded-xl border text-sm transition-all ${
                    isSelected
                      ? 'border-spark-500 bg-spark-500/10 text-spark-400'
                      : 'border-neutral-800 bg-surface-raised text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {opt.label || opt.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="flex-1 py-3 rounded-xl border border-neutral-800 text-neutral-300 text-sm hover:border-neutral-700"
          >
            Previous
          </button>
        )}

        {isLastQuestion && allAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-spark-500 hover:bg-spark-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              'Crunching your vibe...'
            ) : (
              <>
                <Flame className="w-4 h-4" /> See my matches
              </>
            )}
          </button>
        ) : (
          !isLastQuestion &&
          answers[currentQ?.id] !== undefined && (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="flex-1 bg-spark-500 hover:bg-spark-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
