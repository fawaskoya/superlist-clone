import OpenAI from 'openai';

function log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [AI]`;
  const logMessage = `${prefix} ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!apiKey) {
  log('Warning: OpenAI API key not found. AI features will not work.', 'warn');
}

const openai = apiKey ? new OpenAI({
  apiKey,
  baseURL,
}) : null;

export async function summarizeTask(title: string, description: string): Promise<string> {
  if (!openai) {
    log('summarizeTask called but OpenAI client is not initialized', 'warn');
    throw new Error('OpenAI API key is not configured');
  }

  if (!title || title.trim().length === 0) {
    throw new Error('Task title is required');
  }

  try {
    log(`Summarizing task: ${title.substring(0, 50)}...`);
    
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

    const summary = response.choices[0]?.message?.content || 'Unable to generate summary';
    log(`Summary generated successfully`);
    return summary;
  } catch (error) {
    log(`Error in summarizeTask: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
    }
    throw new Error('Failed to generate task summary');
  }
}

export async function generateSubtasks(title: string, description?: string): Promise<string[]> {
  if (!openai) {
    log('generateSubtasks called but OpenAI client is not initialized', 'warn');
    throw new Error('OpenAI API key is not configured');
  }

  if (!title || title.trim().length === 0) {
    throw new Error('Task title is required');
  }

  try {
    log(`Generating subtasks for: ${title.substring(0, 50)}...`);
    
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
        const filtered = subtasks.filter((s: any) => typeof s === 'string').slice(0, 5);
        log(`Generated ${filtered.length} subtasks`);
        return filtered;
      }
    } catch (parseError) {
      log(`Failed to parse subtasks as JSON, trying line-based parsing: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 'warn');
      const lines = content.split('\n').filter(line => line.trim());
      const subtasks = lines.slice(0, 5);
      log(`Generated ${subtasks.length} subtasks from lines`);
      return subtasks;
    }

    log('No subtasks generated', 'warn');
    return [];
  } catch (error) {
    log(`Error in generateSubtasks: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
    }
    throw new Error('Failed to generate subtasks');
  }
}

export async function prioritizeTasks(
  tasks: Array<{ id: string; title: string; description?: string; priority?: string }>
): Promise<Array<{ id: string; suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' }>> {
  if (!openai) {
    log('prioritizeTasks called but OpenAI client is not initialized', 'warn');
    throw new Error('OpenAI API key is not configured');
  }

  if (!tasks || tasks.length === 0) {
    throw new Error('At least one task is required');
  }

  if (tasks.length > 50) {
    log(`Warning: prioritizeTasks called with ${tasks.length} tasks, limiting to 50`, 'warn');
    tasks = tasks.slice(0, 50);
  }

  try {
    log(`Prioritizing ${tasks.length} task(s)`);
    
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
        const result = priorities.map((p: any) => ({
          id: p.id,
          suggestedPriority: ['LOW', 'MEDIUM', 'HIGH'].includes(p.suggestedPriority)
            ? p.suggestedPriority
            : 'MEDIUM',
        }));
        log(`Prioritized ${result.length} task(s) successfully`);
        return result;
      }
    } catch (parseError) {
      log(`Failed to parse priorities as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}, returning default priorities`, 'warn');
      return tasks.map(t => ({ id: t.id, suggestedPriority: 'MEDIUM' as const }));
    }

    log('No priorities generated, returning default', 'warn');
    return tasks.map(t => ({ id: t.id, suggestedPriority: 'MEDIUM' as const }));
  } catch (error) {
    log(`Error in prioritizeTasks: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }
    }
    throw new Error('Failed to prioritize tasks');
  }
}
