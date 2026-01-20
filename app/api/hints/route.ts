import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface ProblemData {
    title: string;
    difficulty: string;
    description: string;
    topicTags: { name: string }[];
    platform: "leetcode" | "codeforces" | "gfg";
}

// Codeforces API to fetch problem details
async function fetchCodeforcesProblem(query: string): Promise<ProblemData | null> {
    const trimmedQuery = query.trim().toUpperCase();

    // Parse Codeforces problem format: "1900A" or "1900/A" or "1900 A"
    const match = trimmedQuery.match(/^(\d+)\s*[\/]?\s*([A-Z]\d?)$/);

    if (!match) {
        // Try searching by problem name
        try {
            const response = await fetch('https://codeforces.com/api/problemset.problems');
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'OK') {
                    const problems = data.result.problems || [];
                    const found = problems.find((p: { name: string }) =>
                        p.name.toLowerCase().includes(query.toLowerCase())
                    );

                    if (found) {
                        const rating = found.rating || 'Unrated';
                        const difficulty = rating <= 1200 ? 'Easy' : rating <= 1800 ? 'Medium' : 'Hard';

                        return {
                            title: `${found.contestId}${found.index}. ${found.name}`,
                            difficulty: `${difficulty} (${rating})`,
                            description: `Problem from Codeforces Contest ${found.contestId}. Problem ${found.index}: ${found.name}. Tags: ${found.tags?.join(', ') || 'None'}`,
                            topicTags: found.tags?.map((t: string) => ({ name: t })) || [],
                            platform: "codeforces",
                        };
                    }
                }
            }
        } catch (error) {
            console.error("Error searching Codeforces problems:", error);
        }
        return null;
    }

    const contestId = match[1];
    const problemIndex = match[2];

    try {
        // Fetch problem from Codeforces API
        const response = await fetch(`https://codeforces.com/api/problemset.problems`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'OK') {
                const problems = data.result.problems || [];
                const found = problems.find((p: { contestId: number; index: string }) =>
                    p.contestId.toString() === contestId && p.index === problemIndex
                );

                if (found) {
                    const rating = found.rating || 'Unrated';
                    const difficulty = typeof rating === 'number'
                        ? (rating <= 1200 ? 'Easy' : rating <= 1800 ? 'Medium' : 'Hard')
                        : 'Unknown';

                    return {
                        title: `${found.contestId}${found.index}. ${found.name}`,
                        difficulty: `${difficulty} (${rating})`,
                        description: `Problem from Codeforces Contest ${found.contestId}. Problem ${found.index}: ${found.name}. Tags: ${found.tags?.join(', ') || 'None'}`,
                        topicTags: found.tags?.map((t: string) => ({ name: t })) || [],
                        platform: "codeforces",
                    };
                }
            }
        }
    } catch (error) {
        console.error("Error fetching Codeforces problem:", error);
    }

    return null;
}

// GeeksforGeeks API to fetch problem details
async function fetchGFGProblem(query: string): Promise<ProblemData | null> {
    const trimmedQuery = query.trim();

    // Convert query to slug format (GFG uses lowercase with hyphens)
    const slug = trimmedQuery.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    try {
        // Try fetching problem details from GFG Practice API
        const response = await fetch(`https://practiceapi.geeksforgeeks.org/api/v1/problems/${slug}/`);

        if (response.ok) {
            const data = await response.json();

            if (data && data.problem_name) {
                const difficulty = data.difficulty || 'Medium';
                const difficultyMap: Record<string, string> = {
                    'school': 'Easy',
                    'basic': 'Easy',
                    'easy': 'Easy',
                    'medium': 'Medium',
                    'hard': 'Hard'
                };

                return {
                    title: data.problem_name,
                    difficulty: difficultyMap[difficulty.toLowerCase()] || difficulty,
                    description: data.problem_statement || `GeeksforGeeks Problem: ${data.problem_name}`,
                    topicTags: data.tags?.map((t: string) => ({ name: t })) || [],
                    platform: "gfg",
                };
            }
        }
    } catch (error) {
        console.error("Error fetching from GFG API:", error);
    }

    // Fallback: Search in GFG problems list
    try {
        const searchResponse = await fetch(`https://practiceapi.geeksforgeeks.org/api/v1/problems/?search=${encodeURIComponent(trimmedQuery)}&pageSize=20`);

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const problems = searchData.results || [];

            const found = problems.find((p: { slug: string; problem_name: string }) =>
                p.slug === slug ||
                p.slug?.includes(slug) ||
                p.problem_name?.toLowerCase().includes(trimmedQuery.toLowerCase())
            );

            if (found) {
                const difficulty = found.difficulty || 'Medium';
                const difficultyMap: Record<string, string> = {
                    'school': 'Easy',
                    'basic': 'Easy',
                    'easy': 'Easy',
                    'medium': 'Medium',
                    'hard': 'Hard'
                };

                return {
                    title: found.problem_name,
                    difficulty: difficultyMap[difficulty.toLowerCase()] || difficulty,
                    description: found.problem_statement || `GeeksforGeeks Problem: ${found.problem_name}. Tags: ${found.tags?.join(', ') || 'DSA'}`,
                    topicTags: found.tags?.map((t: string) => ({ name: t })) || [{ name: 'DSA' }],
                    platform: "gfg",
                };
            }
        }
    } catch (error) {
        console.error("Error searching GFG problems:", error);
    }

    // Final fallback: Use the query as problem info for Gemini
    // GFG problems might not always be in the API, so we create a basic entry
    if (trimmedQuery.length > 3) {
        return {
            title: trimmedQuery,
            difficulty: 'Medium',
            description: `GeeksforGeeks Problem: ${trimmedQuery}. This is a DSA problem from GeeksforGeeks practice section.`,
            topicTags: [{ name: 'DSA' }, { name: 'GeeksforGeeks' }],
            platform: "gfg",
        };
    }

    return null;
}

// LeetCode API to fetch problem details
async function fetchLeetCodeProblem(query: string): Promise<ProblemData | null> {
    const trimmedQuery = query.trim();
    const isNumber = /^\d+$/.test(trimmedQuery);

    // Convert query to slug format
    const slug = trimmedQuery.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Try direct slug fetch first (works for problem names like "two-sum")
    if (!isNumber) {
        try {
            const response = await fetch(`https://alfa-leetcode-api.onrender.com/select?titleSlug=${slug}`);
            if (response.ok) {
                const data = await response.json();
                if (data.questionTitle) {
                    return {
                        title: data.questionTitle,
                        difficulty: data.difficulty,
                        description: data.question,
                        topicTags: data.topicTags || [],
                        platform: "leetcode",
                    };
                }
            }
        } catch (error) {
            console.error("Error fetching by slug:", error);
        }
    }

    // For numbers or if slug didn't work, use GraphQL to get problem list
    try {
        const graphqlQuery = {
            query: `
                query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                    problemsetQuestionList: questionList(
                        categorySlug: $categorySlug
                        limit: $limit
                        skip: $skip
                        filters: $filters
                    ) {
                        questions: data {
                            frontendQuestionId: questionFrontendId
                            title
                            titleSlug
                            difficulty
                            topicTags {
                                name
                            }
                        }
                    }
                }
            `,
            variables: {
                categorySlug: "",
                skip: 0,
                limit: 3000,
                filters: {}
            }
        };

        const listResponse = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(graphqlQuery)
        });

        if (listResponse.ok) {
            const listData = await listResponse.json();
            const questions = listData.data?.problemsetQuestionList?.questions || [];

            const found = questions.find((p: { frontendQuestionId: string; titleSlug: string; title: string }) => {
                if (isNumber) {
                    return p.frontendQuestionId === trimmedQuery;
                }
                return p.titleSlug === slug ||
                    p.titleSlug.includes(slug) ||
                    p.title.toLowerCase().includes(trimmedQuery.toLowerCase());
            });

            if (found) {
                const detailQuery = {
                    query: `
                        query questionContent($titleSlug: String!) {
                            question(titleSlug: $titleSlug) {
                                content
                                questionFrontendId
                                title
                                difficulty
                                topicTags {
                                    name
                                }
                            }
                        }
                    `,
                    variables: { titleSlug: found.titleSlug }
                };

                const detailResponse = await fetch('https://leetcode.com/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(detailQuery)
                });

                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    const question = detailData.data?.question;

                    if (question) {
                        return {
                            title: question.title,
                            difficulty: question.difficulty,
                            description: question.content || `Problem: ${question.title}`,
                            topicTags: question.topicTags || [],
                            platform: "leetcode",
                        };
                    }
                }

                return {
                    title: found.title,
                    difficulty: found.difficulty,
                    description: `Problem ${found.frontendQuestionId}: ${found.title}`,
                    topicTags: found.topicTags || [],
                    platform: "leetcode",
                };
            }
        }
    } catch (error) {
        console.error("Error fetching from LeetCode GraphQL:", error);
    }

    // Final fallback: try alfa-leetcode-api problems list
    try {
        const fallbackResponse = await fetch(`https://alfa-leetcode-api.onrender.com/problems?limit=100`);
        if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const problems = fallbackData.problemsetQuestionList || [];

            const found = problems.find((p: { frontendQuestionId: string; titleSlug: string; title: string }) => {
                if (isNumber) {
                    return p.frontendQuestionId === trimmedQuery;
                }
                return p.titleSlug?.includes(slug) || p.title?.toLowerCase().includes(trimmedQuery.toLowerCase());
            });

            if (found) {
                const detailResponse = await fetch(`https://alfa-leetcode-api.onrender.com/select?titleSlug=${found.titleSlug}`);
                if (detailResponse.ok) {
                    const data = await detailResponse.json();
                    if (data.questionTitle) {
                        return {
                            title: data.questionTitle,
                            difficulty: data.difficulty,
                            description: data.question,
                            topicTags: data.topicTags || [],
                            platform: "leetcode",
                        };
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error in fallback fetch:", error);
    }

    return null;
}

// Strip HTML tags for cleaner prompt
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        const { query, platform = "leetcode" } = await request.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }

        // Fetch problem details based on platform
        let problem: ProblemData | null = null;

        if (platform === "codeforces") {
            problem = await fetchCodeforcesProblem(query);
        } else if (platform === "gfg") {
            problem = await fetchGFGProblem(query);
        } else {
            problem = await fetchLeetCodeProblem(query);
        }

        if (!problem) {
            const errorMessages: Record<string, string> = {
                codeforces: "Could not find the problem. Try format like '1900A' or '1900/A' or problem name",
                gfg: "Could not find the problem. Try the exact problem name (e.g., 'reverse-a-linked-list')",
                leetcode: "Could not find the problem. Try using the exact problem name or number (e.g., 'two-sum' or '1')"
            };
            return NextResponse.json({ error: errorMessages[platform] || errorMessages.leetcode }, { status: 404 });
        }

        const cleanDescription = stripHtml(problem.description);
        const tags = problem.topicTags?.map((t: { name: string }) => t.name).join(", ") || "Not specified";

        // Generate hints using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const platformNames: Record<string, string> = {
            codeforces: "Codeforces",
            gfg: "GeeksforGeeks",
            leetcode: "LeetCode"
        };
        const platformName = platformNames[platform] || "LeetCode";
        const prompt = `You are a DSA mentor helping a student solve a ${platformName} problem. Generate exactly 5 progressive hints that guide them toward the solution WITHOUT revealing the actual code or complete algorithm.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Tags: ${tags}
Platform: ${platformName}

Description:
${cleanDescription}

Generate 5 hints following this exact structure:
1. **Hint 1 - Problem Recognition**: Help identify what category this problem belongs to and what similar problems they might have seen. Ask guiding questions about the problem constraints.
2. **Hint 2 - Key Observation**: Point out the crucial insight or pattern they need to notice. What property of the input/output is important?
3. **Hint 3 - Technique/Data Structure**: Suggest what technique or data structure would be helpful. Why would it help?
4. **Hint 4 - Approach Steps**: Break down the high-level approach into steps (NOT code). What should they do first, second, etc.?
5. **Hint 5 - Pseudo-code Skeleton**: Provide a rough pseudo-code outline with placeholders. NO actual programming language syntax.

IMPORTANT RULES:
- NEVER reveal the complete solution or working code
- Use encouraging, educational language
- Make each hint build upon the previous one
- Keep hints concise but helpful (2-4 sentences each)
- For pseudo-code, use plain English with indentation

Return ONLY a JSON object in this exact format:
{
  "hints": [
    {"step": 1, "title": "Problem Recognition", "content": "..."},
    {"step": 2, "title": "Key Observation", "content": "..."},
    {"step": 3, "title": "Technique / Data Structure", "content": "..."},
    {"step": 4, "title": "Approach Steps", "content": "..."},
    {"step": 5, "title": "Pseudo-code Skeleton", "content": "..."}
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: "Failed to generate hints" }, { status: 500 });
        }

        const hintsData = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            problem: {
                title: problem.title,
                difficulty: problem.difficulty,
                tags: problem.topicTags?.map((t: { name: string }) => t.name) || [],
                platform: problem.platform,
            },
            hints: hintsData.hints,
        });

    } catch (error) {
        console.error("Error generating hints:", error);
        return NextResponse.json({ error: "Failed to generate hints. Please try again." }, { status: 500 });
    }
}
