"use client";

import HintCard from "./HintCard";

interface Hint {
    step: number;
    title: string;
    content: string;
}

interface HintStepperProps {
    hints: Hint[];
    currentStep: number;
    onReveal: () => void;
}

export default function HintStepper({ hints, currentStep, onReveal }: HintStepperProps) {
    return (
        <div className="hint-stepper">
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${(currentStep / hints.length) * 100}%` }}
                />
                <div className="progress-steps">
                    {hints.map((_, index) => (
                        <div
                            key={index}
                            className={`progress-dot ${index < currentStep ? "completed" : ""} ${index === currentStep ? "current" : ""}`}
                        />
                    ))}
                </div>
            </div>

            <div className="hints-list">
                {hints.map((hint, index) => (
                    <HintCard
                        key={hint.step}
                        hint={hint}
                        isUnlocked={index < currentStep}
                        isCurrent={index === currentStep}
                        onReveal={onReveal}
                    />
                ))}
            </div>

            {currentStep >= hints.length && (
                <div className="completion-message">
                    <span>🎉</span>
                    <p>You&apos;ve revealed all hints! Now try solving it yourself.</p>
                </div>
            )}
        </div>
    );
}
