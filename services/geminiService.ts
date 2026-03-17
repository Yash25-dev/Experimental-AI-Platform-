
import { GoogleGenAI, Type } from "@google/genai";
import { AiExplanation, Quiz, QuizResult, ExecutionResult, CodeErrorInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Consolidated call: Validates code, simulates execution, AND provides explanation in one trip.
 * This drastically reduces API usage and helps avoid 429 Quota errors.
 */
export const analyzeCode = async (
  language: string,
  code: string,
  repeatCount: number
): Promise<{
  execution: ExecutionResult;
  explanation?: AiExplanation;
}> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert compiler and mentor for ${language}. 
    Analyze this code (Encounter #${repeatCount} for this student).
    
    Code:
    \`\`\`
    ${code}
    \`\`\`
    
    1. Check for syntax/runtime/logic errors.
    2. If valid, simulate output.
    3. If invalid, explain what happened, why, and how to fix it in beginner terms.
    4. CONCISENESS: Every explanation field (what_happened, why_it_happened, how_to_fix, deeper_note) MUST be maximum 2 sentences long.
    5. DIRECT FEEDBACK: Point directly to data anomalies or logic flaws (e.g., 'Your Resistance values are inconsistent. Did the wire heat up?').
    6. CRITICAL: NEVER explicitly reveal the mathematical formula (e.g., V=IR) or the direct code solution in the explanation or how_to_fix. Instead, use conceptual questions or describe the physical/logical relationship (e.g., 'Recall how resistance affects the flow of current').`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          success: { type: Type.BOOLEAN },
          output: { type: Type.STRING },
          error: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              msg: { type: Type.STRING },
              concept: { type: Type.STRING }
            },
            required: ["type", "msg", "concept"]
          },
          explanation: {
            type: Type.OBJECT,
            properties: {
              what_happened: { type: Type.STRING },
              why_it_happened: { type: Type.STRING },
              concept: { type: Type.STRING },
              how_to_fix: { type: Type.STRING },
              deeper_note: { type: Type.STRING }
            },
            required: ["what_happened", "why_it_happened", "concept", "how_to_fix"]
          }
        },
        required: ["success"]
      }
    }
  });

  const data = JSON.parse(response.text?.trim() || "{}");
  return {
    execution: {
      success: data.success,
      output: data.output,
      error: data.error
    },
    explanation: data.explanation
  };
};

export const generateQuiz = async (
  language: string,
  errorType: string,
  concept: string,
  repeatCount: number
): Promise<Quiz> => {
  const isBasicSyntax = ["SyntaxError", "IndentationError", "CompileError"].includes(errorType);
  
  // Determine difficulty range based on repeatCount (student's progress with this specific error)
  let difficultyGuidance = "";
  if (isBasicSyntax) {
    difficultyGuidance = "All 5 questions must be 'Very Easy' or 'Easy'. Focus strictly on the syntax error.";
  } else if (repeatCount <= 1) {
    difficultyGuidance = "Difficulty should be mostly 'Very Easy' and 'Easy' to build confidence.";
  } else if (repeatCount <= 3) {
    difficultyGuidance = "Difficulty should range from 'Easy' to 'Medium'.";
  } else {
    difficultyGuidance = "Difficulty should range from 'Medium' to 'Hard'.";
  }

  const prompt = `Generate 5 ${language} coding quiz questions strictly focused on the following error/concept: "${concept}" (Error Type: ${errorType}).
    
    CRITICAL RULES:
    1. DO NOT include any concepts outside of "${concept}".
    2. The questions must directly help the student understand and fix the specific ${errorType} they encountered.
    3. ${difficultyGuidance}
    4. Each question MUST have an explicit 'difficulty' field set to one of: 'Very Easy', 'Easy', 'Medium', 'Hard'.
    5. If the error is a basic syntax error (missing quotes, brackets, etc.), do NOT use logic like 'if' or 'loops'.
    6. CONCISENESS: Every description, expected_behavior, and hint MUST be maximum 2 sentences long.
    7. DIRECT FEEDBACK: Point directly to the conceptual anomaly.
    8. NEVER explicitly reveal the mathematical formula or the direct code solution in the description, expected_behavior, or hint. Focus on the application of the law and conceptual understanding.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING },
          language: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                difficulty: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                starter_code: { type: Type.STRING },
                expected_behavior: { type: Type.STRING },
                hint: { type: Type.STRING }
              },
              required: ["id", "difficulty", "title", "description", "starter_code", "expected_behavior", "hint"]
            }
          }
        },
        required: ["concept", "language", "questions"]
      }
    }
  });

  return JSON.parse(response.text?.trim() || "{}");
};

export const evaluateQuizAnswer = async (
  language: string,
  description: string,
  expected: string,
  studentCode: string
): Promise<QuizResult> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Task (${language}): "${description}"
    Expected Behavior: "${expected}"
    
    Student Submission:
    \`\`\`${language}
    ${studentCode}
    \`\`\`
    
    CRITICAL INSTRUCTIONS:
    1. Be an extremely strict judge. If there are syntax errors, logic flaws, or if the code doesn't achieve the expected behavior, set 'correct' to false.
    2. You MUST provide the 'correct_code' which is a clean, optimized version of the solution.
    3. If the code is correct, still provide the 'correct_code' as a reference.
    4. Provide detailed feedback explaining WHY it is correct or incorrect.
    5. CONCISENESS: Every feedback and improvement field MUST be maximum 2 sentences long.
    6. DIRECT FEEDBACK: Point directly to the error or success point.
    7. NEVER explicitly reveal the mathematical formula or the direct code solution in the feedback or improvement. Use conceptual guidance instead.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correct: { type: Type.BOOLEAN },
          output_simulation: { type: Type.STRING },
          feedback: { type: Type.STRING },
          improvement: { type: Type.STRING },
          correct_code: { type: Type.STRING }
        },
        required: ["correct", "output_simulation", "feedback", "improvement", "correct_code"]
      }
    }
  });

  return JSON.parse(response.text?.trim() || "{}");
};

export const checkReportPlagiarism = async (
  experimentTitle: string,
  reportText: string
): Promise<{ similarityIndex: number; sourceMatch: string }> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Compare the following student lab report for the experiment "${experimentTitle}" against standard lab manuals (like NCERT, ICSE, or common online resources).
    
    Student Report:
    "${reportText}"
    
    1. Calculate a Similarity Index (0-100%).
    2. Identify the likely source if similarity is high (>40%).
    3. Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          similarityIndex: { type: Type.NUMBER },
          sourceMatch: { type: Type.STRING }
        },
        required: ["similarityIndex", "sourceMatch"]
      }
    }
  });
  return JSON.parse(response.text?.trim() || "{}");
};
