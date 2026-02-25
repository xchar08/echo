const NEBIUS_API_KEY = import.meta.env.VITE_NEBIUS_API_KEY;
const NEBIUS_API_URL = "https://api.studio.nebius.ai/v1/chat/completions";
const MODEL_ID = "meta-llama/Meta-Llama-3.1-8B-Instruct-fast";

export async function nebiusChatCompletion(systemPrompt: string, userPrompt: string) {
  const response = await fetch(NEBIUS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NEBIUS_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Nebius API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generates notes using an RNN-like chunking approach to handle large contexts.
 * It passes the running summary and the next chunk of the transcript to the model.
 */
export async function generateRNNSummary(transcript: string, onProgress?: (chunkIndex: number, totalChunks: number) => void): Promise<string> {
  if (!transcript || transcript.trim().length === 0) {
    return "No transcript available to summarize.";
  }

  // Roughly split by 1000 words
  const words = transcript.split(/\s+/);
  const CHUNK_SIZE = 1000;
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
  }

  let runningSummary = "";

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) {
      onProgress(i + 1, chunks.length);
    }
    
    const chunk = chunks[i];
    
    const systemPrompt = `You are an expert academic note-taker. You are processing a transcript in chunks to create final study notes. 
You will be provided with the CURRENT ROLLING SUMMARY and the NEXT SUMMARY CHUNK from the transcript.
Update and expand the rolling summary to incorporate the new information from the chunk, keeping it organized into topics with LaTeX math support.
If the professor explains a complex process, relationship, architecture, or flow, you MUST generate a Mermaid.js diagram to visualize it (use \`\`\`mermaid ... \`\`\`).
If the current rolling summary is empty, simply summarize the first chunk.
Make sure the output is cohesive and formatted in Markdown. Do not include conversational filler like "Here is the summary". Your entire response should be the new rolling summary.`;

    const userPrompt = `CURRENT ROLLING SUMMARY:
${runningSummary || "(Empty - this is the first chunk)"}

NEXT TRANSCRIPT CHUNK:
${chunk}`;

    runningSummary = await nebiusChatCompletion(systemPrompt, userPrompt);
  }

  return runningSummary;
}

export async function generateFlashcards(notes: string) {
  const systemPrompt = `You are a study assistant. Create 5 flashcards based on the provided notes. 
Output exactly in this JSON format:
[
  { "term": "Concept", "definition": "Explanation" }
]
Do not output any markdown code blocks, just raw JSON.`;

  const response = await nebiusChatCompletion(systemPrompt, notes);
  
  try {
    const rawData = JSON.parse(response);
    return rawData.map((item: any) => ({
      id: crypto.randomUUID(),
      term: item.term,
      definition: item.definition,
      known: false
    }));
  } catch (e) {
    console.error("Failed to parse flashcards JSON:", e);
    return [];
  }
}

export async function generateQuiz(notes: string) {
  const systemPrompt = `You are a study assistant. Create 3 multiple choice quiz questions based on the provided notes.
Output exactly in this JSON format:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation for correct answer."
  }
]
correctAnswer must be the integer index (0-3) of the correct option.
Do not output any markdown code blocks, just raw JSON.`;

  const response = await nebiusChatCompletion(systemPrompt, notes);
  
  try {
    const rawData = JSON.parse(response);
    return rawData.map((item: any) => ({
      id: crypto.randomUUID(),
      question: item.question,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation
    }));
  } catch (e) {
    console.error("Failed to parse quiz JSON:", e);
    return [];
  }
}
