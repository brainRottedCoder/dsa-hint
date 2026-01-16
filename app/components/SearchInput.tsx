"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchInputProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
}

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
            onSearch(query.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="search-container">
            <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter problem number or name (e.g., '1' or 'two-sum')"
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
