"use client";

import { Lock, Unlock, ChevronRight } from "lucide-react";

interface Hint {
    step: number;
    title: string;
    content: string;
}

interface HintCardProps {
    hint: Hint;
    isUnlocked: boolean;
    isCurrent: boolean;
    onReveal: () => void;
}

export default function HintCard({ hint, isUnlocked, isCurrent, onReveal }: HintCardProps) {
    return (
        <div
            className={`hint-card ${isUnlocked ? "unlocked" : "locked"} ${isCurrent ? "current" : ""}`}
        >
            <div className="hint-header">
                <div className="hint-step">
                    <span className="step-number">{hint.step}</span>
                    <span className="step-title">{hint.title}</span>
                </div>
                {isUnlocked ? (
                    <Unlock className="hint-icon unlocked" size={18} />
                ) : (
                    <Lock className="hint-icon locked" size={18} />
                )}
            </div>

            {isUnlocked ? (
                <div className="hint-content">
                    <p>{hint.content}</p>
                </div>
            ) : (
                <div className="hint-locked-content">
                    {isCurrent ? (
                        <button className="reveal-button" onClick={onReveal}>
                            <span>Reveal Hint</span>
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <p className="locked-message">Complete previous hints first</p>
                    )}
                </div>
            )}
        </div>
    );
}
