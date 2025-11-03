import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function summarizeTask(title: string, description: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes tasks. Provide concise, actionable summaries in 1-2 sentences.',
        },
        {
          role: 'user',
          content: `Summarize this task:\nTitle: ${title}\nDescription: ${description || 'No description provided'}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Error in summarizeTask:', error);
    throw new Error('Failed to generate task summary');
  }
}

export async function generateSubtasks(title: string, description?: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that breaks down tasks into actionable subtasks. Generate 3-5 clear, specific subtasks. Return ONLY a JSON array of strings, nothing else.',
        },
        {
          role: 'user',
          content: `Generate subtasks for:\nTitle: ${title}\nDescription: ${description || 'No description'}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    try {
      const subtasks = JSON.parse(content);
      if (Array.isArray(subtasks)) {
        return subtasks.filter((s: any) => typeof s === 'string').slice(0, 5);
      }
    } catch {
      const lines = content.split('\n').filter(line => line.trim());
      return lines.slice(0, 5);
    }

    return [];
  } catch (error) {
    console.error('Error in generateSubtasks:', error);
    throw new Error('Failed to generate subtasks');
  }
}

export async function prioritizeTasks(
  tasks: Array<{ id: string; title: string; description?: string; priority?: string }>
): Promise<Array<{ id: string; suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' }>> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that prioritizes tasks. Analyze tasks and suggest priority levels (LOW, MEDIUM, or HIGH) based on urgency, importance, and impact. Return ONLY a JSON array of objects with id and suggestedPriority fields.',
        },
        {
          role: 'user',
          content: `Prioritize these tasks:\n${JSON.stringify(tasks, null, 2)}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    try {
      const priorities = JSON.parse(content);
      if (Array.isArray(priorities)) {
        return priorities.map((p: any) => ({
          id: p.id,
          suggestedPriority: ['LOW', 'MEDIUM', 'HIGH'].includes(p.suggestedPriority)
            ? p.suggestedPriority
            : 'MEDIUM',
        }));
      }
    } catch {
      return tasks.map(t => ({ id: t.id, suggestedPriority: 'MEDIUM' as const }));
    }

    return tasks.map(t => ({ id: t.id, suggestedPriority: 'MEDIUM' as const }));
  } catch (error) {
    console.error('Error in prioritizeTasks:', error);
    throw new Error('Failed to prioritize tasks');
  }
}
