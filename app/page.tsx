"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Lightbulb, AlertCircle } from "lucide-react";
import SearchInput from "./components/SearchInput";
import HintStepper from "./components/HintStepper";
import HistorySidebar from "./components/HistorySidebar";

type Platform = "leetcode" | "codeforces";

interface Hint {
  step: number;
  title: string;
  content: string;
}

interface Problem {
  title: string;
  difficulty: string;
  tags: string[];
  platform?: Platform;
}

interface HistoryItem {
  id: string;
  title: string;
  difficulty: string;
  timestamp: number;
  currentStep: number;
  hints: Hint[];
  problem: Problem;
  platform?: Platform;
}

const STORAGE_KEY = "dsa-hinter-history";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);

  // Use ref to track history without causing re-renders in useEffect
  const historyRef = useRef<HistoryItem[]>([]);
  historyRef.current = history;

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        console.error("Failed to parse history");
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((items: HistoryItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setHistory(items);
  }, []);

  // Update current problem in history when step changes
  useEffect(() => {
    if (currentProblemId && hints.length > 0 && currentStep > 0) {
      const updatedHistory = historyRef.current.map((item) =>
        item.id === currentProblemId ? { ...item, currentStep } : item
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    }
  }, [currentStep, currentProblemId, hints.length]);

  const handleSearch = async (query: string, platform: Platform = "leetcode") => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch hints");
      }

      setProblem(data.problem);
      setHints(data.hints);
      setCurrentStep(0);

      // Create new history entry
      const problemId = `${data.problem.title}-${Date.now()}`;
      setCurrentProblemId(problemId);

      const newHistoryItem: HistoryItem = {
        id: problemId,
        title: data.problem.title,
        difficulty: data.problem.difficulty,
        timestamp: Date.now(),
        currentStep: 0,
        hints: data.hints,
        problem: data.problem,
        platform: data.problem.platform,
      };

      // Add to history (keep last 20)
      const newHistory = [newHistoryItem, ...history].slice(0, 20);
      saveHistory(newHistory);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = () => {
    if (currentStep < hints.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleHistorySelect = (id: string) => {
    const item = history.find((h) => h.id === id);
    if (item) {
      setProblem(item.problem);
      setHints(item.hints);
      setCurrentStep(item.currentStep);
      setCurrentProblemId(id);
      setIsHistoryOpen(false);
      setError(null);
    }
  };

  const handleHistoryDelete = (id: string) => {
    const newHistory = history.filter((h) => h.id !== id);
    saveHistory(newHistory);

    if (currentProblemId === id) {
      setProblem(null);
      setHints([]);
      setCurrentStep(0);
      setCurrentProblemId(null);
    }
  };

  const handleHistoryClear = () => {
    saveHistory([]);
    setProblem(null);
    setHints([]);
    setCurrentStep(0);
    setCurrentProblemId(null);
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "difficulty-easy";
      case "medium":
        return "difficulty-medium";
      case "hard":
        return "difficulty-hard";
      default:
        return "";
    }
  };

  return (
    <main className="main-container">
      <header className="header">
        <div className="logo">
          <Lightbulb className="logo-icon" size={32} />
          <h1>DSA Hinter</h1>
        </div>
        <p className="tagline">Get progressive hints for LeetCode problems without spoilers</p>

        <HistorySidebar
          history={history}
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
          onSelect={handleHistorySelect}
          onDelete={handleHistoryDelete}
          onClear={handleHistoryClear}
        />
      </header>

      <section className="search-section">
        <SearchInput onSearch={handleSearch} isLoading={isLoading} />
      </section>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {problem && hints.length > 0 && (
        <section className="problem-section">
          <div className="problem-header">
            <h2 className="problem-title">{problem.title}</h2>
            <span className={`difficulty-badge large ${getDifficultyClass(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
          </div>

          {problem.tags.length > 0 && (
            <div className="problem-tags">
              {problem.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}

          <HintStepper
            hints={hints}
            currentStep={currentStep}
            onReveal={handleReveal}
          />
        </section>
      )}

      {!problem && !isLoading && !error && (
        <section className="welcome-section">
          <div className="welcome-content">
            <div className="welcome-icon">💡</div>
            <h2>How it works</h2>
            <ol className="steps-list">
              <li>Enter a LeetCode problem number or name</li>
              <li>Get 5 progressive hints that guide your thinking</li>
              <li>Reveal hints one at a time as you need them</li>
              <li>Solve the problem yourself with the insights gained!</li>
            </ol>
          </div>
        </section>
      )}
    </main>
  );
}
