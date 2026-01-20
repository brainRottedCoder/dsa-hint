"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

type Platform = "leetcode" | "codeforces";

interface SearchInputProps {
    onSearch: (query: string, platform: Platform) => void;
    isLoading: boolean;
}

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
    const [query, setQuery] = useState("");
    const [platform, setPlatform] = useState<Platform>("leetcode");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
            onSearch(query.trim(), platform);
        }
    };

    const placeholders = {
        leetcode: "Enter problem number or name (e.g., '1' or 'two-sum')",
        codeforces: "Enter problem ID (e.g., '1900A' or '1900/A')",
    };

    return (
        <form onSubmit={handleSubmit} className="search-container">
            <div className="platform-toggle">
                <button
                    type="button"
                    className={`platform-btn ${platform === "leetcode" ? "active" : ""}`}
                    onClick={() => setPlatform("leetcode")}
                >
                    <span className="platform-icon">📗</span>
                    LeetCode
                </button>
                <button
                    type="button"
                    className={`platform-btn ${platform === "codeforces" ? "active" : ""}`}
                    onClick={() => setPlatform("codeforces")}
                >
                    <span className="platform-icon">🔵</span>
                    Codeforces
                </button>
            </div>

            <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholders[platform]}
                    className="search-input"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="search-button"
                    disabled={!query.trim() || isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        "Get Hints"
                    )}
                </button>
            </div>
        </form>
    );
}
