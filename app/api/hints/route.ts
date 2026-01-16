import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// LeetCode API to fetch problem details
async function fetchLeetCodeProblem(query: string) {
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
                    };
                }
            }
        } catch (error) {
            console.error("Error fetching by slug:", error);
        }
    }

    // For numbers or if slug didn't work, use GraphQL to get problem list
    try {
        // Use the LeetCode GraphQL endpoint via a proxy
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

            // Find matching problem
            const found = questions.find((p: { frontendQuestionId: string; titleSlug: string; title: string }) => {
                if (isNumber) {
                    return p.frontendQuestionId === trimmedQuery;
                }
                return p.titleSlug === slug ||
                    p.titleSlug.includes(slug) ||
                    p.title.toLowerCase().includes(trimmedQuery.toLowerCase());
            });

            if (found) {
                // Fetch full problem details
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
                        };
                    }
                }

                // If detail fetch fails, use the basic info we have
                return {
                    title: found.title,
                    difficulty: found.difficulty,
                    description: `Problem ${found.frontendQuestionId}: ${found.title}`,
                    topicTags: found.topicTags || [],
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
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }

        // Fetch problem details
        const problem = await fetchLeetCodeProblem(query);

        if (!problem) {
            return NextResponse.json({
                error: "Could not find the problem. Try using the exact problem name or number (e.g., 'two-sum' or '1')"
            }, { status: 404 });
        }

        const cleanDescription = stripHtml(problem.description);
        const tags = problem.topicTags?.map((t: { name: string }) => t.name).join(", ") || "Not specified";

        // Generate hints using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a DSA mentor helping a student solve a LeetCode problem. Generate exactly 5 progressive hints that guide them toward the solution WITHOUT revealing the actual code or complete algorithm.

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Tags: ${tags}

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
            },
            hints: hintsData.hints,
        });

    } catch (error) {
        console.error("Error generating hints:", error);
        return NextResponse.json({ error: "Failed to generate hints. Please try again." }, { status: 500 });
    }
}
