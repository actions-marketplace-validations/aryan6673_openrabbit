import * as core from '@actions/core';
import * as github from '@actions/github';
import { runReview } from './reviewer.js';

function getInputValue(name: string, fallback?: string): string | undefined {
  const value = core.getInput(name);
  return value.length ? value : fallback;
}

async function run(): Promise<void> {
  const githubToken = core.getInput('github_token', { required: true });
  const llmProvider = (getInputValue('llm_provider', 'groq') ?? 'groq') as import('./types.js').LLMProvider;
  const llmApiUrl = getInputValue('llm_api_url', process.env.LLM_API_URL ?? 'https://api.groq.ai/v1') ?? 'https://api.groq.ai/v1';
  const llmApiKey = getInputValue('llm_api_key', process.env.LLM_API_KEY ?? '');
  const reviewMode = (getInputValue('review_mode', 'both') ?? 'both') as import('./types.js').ReviewMode;
  const repository = github.context.repo;
  const pullRequestNumber = github.context.payload.pull_request?.number;

  if (!llmApiKey) {
    core.setFailed('LLM API key is required through llm_api_key input or LLM_API_KEY env var.');
    return;
  }

  if (!pullRequestNumber) {
    core.setFailed('Pull request number is required from the GitHub event context.');
    return;
  }

  await runReview({
    owner: repository.owner,
    repo: repository.repo,
    pullNumber: pullRequestNumber,
    githubToken,
    llmProvider: llmProvider as import('./types.js').LLMProvider,
    llmApiUrl,
    llmApiKey,
    reviewMode: reviewMode as import('./types.js').ReviewMode,
  });
}

run().catch((error) => core.setFailed(`${error}`));
