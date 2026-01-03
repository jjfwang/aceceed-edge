import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import type { GradeBand, RagChunk } from "@aceceed/shared";
import type { RagRetriever } from "./types.js";

interface StoredChunk extends RagChunk {
  // no extra fields; kept for clarity
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreChunk(queryTokens: string[], chunk: RagChunk): number {
  const tagText = chunk.tags?.join(" ") ?? "";
  const haystack = tokenize(`${chunk.content} ${chunk.topic} ${chunk.subject} ${tagText}`);
  let hits = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      hits += 1;
    }
  }
  return hits / Math.max(haystack.length, 1);
}

export class LocalRagRetriever implements RagRetriever {
  private chunks: RagChunk[] = [];

  constructor(private indexPath: string, private logger?: Logger) {}

  async init(): Promise<void> {
    const candidates = [
      path.resolve(this.indexPath),
      path.resolve(process.cwd(), this.indexPath),
      path.resolve(process.cwd(), "..", this.indexPath)
    ];
    let data: Buffer | null = null;
    let resolved = "";
    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        data = await fs.readFile(candidate);
        resolved = candidate;
        break;
      } catch (err) {
        lastError = err as Error;
        continue;
      }
    }

    if (!data) {
      throw new Error(
        `RAG index not found. Tried: ${candidates.join(", ")}. Last error: ${lastError?.message ?? "unknown"}`
      );
    }

    try {
      const parsed = JSON.parse(data.toString()) as StoredChunk[];
      this.chunks = parsed;
    } catch (err) {
      throw new Error(`Failed to parse RAG index at ${resolved}: ${(err as Error).message}`);
    }
    if (this.logger) {
      this.logger.info(
        { count: this.chunks.length, indexPath: resolved },
        "Loaded RAG curriculum index"
      );
    }
  }

  async retrieve(
    query: string,
    options: {
      gradeBand: GradeBand;
      subjects: string[];
      limit: number;
      includeSources?: boolean;
      sourceTypes?: string[];
    }
  ): Promise<RagChunk[]> {
    if (!this.chunks.length) {
      return [];
    }
    const queryTokens = tokenize(query);
    const filtered = this.chunks.filter(
      (chunk) =>
        chunk.gradeBand === options.gradeBand &&
        (options.subjects.length === 0 || options.subjects.includes(chunk.subject)) &&
        (!options.sourceTypes?.length || (chunk.sourceType && options.sourceTypes.includes(chunk.sourceType)))
    );
    const scored = filtered
      .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit)
      .map(({ chunk }) => chunk);

    if (!options.includeSources) {
      return scored.map(({ source, ...rest }) => rest);
    }
    return scored;
  }
}
