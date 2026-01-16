"use client";

import { History, Trash2, ChevronRight, X } from "lucide-react";

interface HistoryItem {
    id: string;
    title: string;
    difficulty: string;
    timestamp: number;
    currentStep: number;
}

interface HistorySidebarProps {
    history: HistoryItem[];
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}

export default function HistorySidebar({
    history,
    isOpen,
    onToggle,
    onSelect,
    onDelete,
    onClear,
}: HistorySidebarProps) {
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
        <>
            <button className="history-toggle" onClick={onToggle}>
                <History size={20} />
                <span>History</span>
                {history.length > 0 && <span className="history-count">{history.length}</span>}
            </button>

            <div className={`history-sidebar ${isOpen ? "open" : ""}`}>
                <div className="history-header">
                    <h3>
                        <History size={18} />
                        Problem History
                    </h3>
                    <button className="close-button" onClick={onToggle}>
                        <X size={20} />
                    </button>
                </div>

                {history.length === 0 ? (
                    <div className="history-empty">
                        <p>No problems viewed yet</p>
                    </div>
                ) : (
                    <>
                        <div className="history-list">
                            {history.map((item) => (
                                <div key={item.id} className="history-item">
                                    <div
                                        className="history-item-content"
                                        onClick={() => onSelect(item.id)}
                                    >
                                        <div className="history-item-title">
                                            <span className={`difficulty-badge ${getDifficultyClass(item.difficulty)}`}>
                                                {item.difficulty}
                                            </span>
                                            <span className="title">{item.title}</span>
                                        </div>
                                        <div className="history-item-meta">
                                            <span className="step-progress">
                                                Step {item.currentStep}/5
                                            </span>
                                            <span className="timestamp">{formatDate(item.timestamp)}</span>
                                        </div>
                                        <ChevronRight className="chevron" size={16} />
                                    </div>
                                    <button
                                        className="delete-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className="clear-history" onClick={onClear}>
                            <Trash2 size={16} />
                            Clear All History
                        </button>
                    </>
                )}
            </div>

            {isOpen && <div className="history-overlay" onClick={onToggle} />}
        </>
    );
}
