import { fetch } from 'undici';
import type { LLMClient } from './index.js';
import type { LLMConfig, ReviewResponse } from '../types.js';

function extractTextFromResponse(body: any): string {
  if (!body) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body.completion === 'string') {
    return body.completion;
  }
  if (Array.isArray(body.completions) && typeof body.completions[0]?.text === 'string') {
    return body.completions[0].text;
  }
  if (Array.isArray(body.outputs) && typeof body.outputs[0]?.content === 'string') {
    return body.outputs[0].content;
  }
  if (typeof body.output === 'string') {
    return body.output;
  }
  return JSON.stringify(body);
}

function parseReviewResponse(raw: string): ReviewResponse {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
      }
    }
    return {
      review: text,
      comments: [],
    };
  }
}

export class GroqClient implements LLMClient {
  readonly apiKey: string;
  readonly apiUrl: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
  }

  async complete(prompt: string): Promise<ReviewResponse> {
    const response = await fetch(`${this.apiUrl}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'groq-alpha-large',
        prompt,
        max_output_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq API error ${response.status}: ${body}`);
    }

    const body = await response.json();
    const text = extractTextFromResponse(body);
    return parseReviewResponse(text);
  }
}
