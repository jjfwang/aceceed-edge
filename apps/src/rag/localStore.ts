import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import type { GradeBand, RagChunk } from "@aceceed/shared";
// We must specify the full path here for tsup to correctly resolve it
import { pipeline, cos_sim } from "@xenova/transformers/src/transformers.js";
import type { Pipeline } from "@xenova/transformers";

import type { RagRetriever } from "./types.js";

/**
 * A singleton class to manage the feature-extraction pipeline.
 * This ensures that the model is loaded only once and reused, which is crucial
 * for performance and memory usage.
 */
class FeatureExtractionPipelineSingleton {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: Promise<Pipeline> | null = null;

  static async getInstance(progress_callback?: (progress: unknown) => void): Promise<Pipeline> {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

interface StoredChunk extends RagChunk {
  embedding?: number[];
}

export class LocalRagRetriever implements RagRetriever {
  private chunks: StoredChunk[] = [];
  private embedder: Pipeline | null = null;

  constructor(private indexPath: string, private logger?: Logger) {}

  async init(): Promise<void> {
    await this.loadAndParseIndex();

    this.logger?.info("Initializing RAG embedder model...");
    this.embedder = await FeatureExtractionPipelineSingleton.getInstance((progress) => {
      this.logger?.info(progress, "Downloading RAG embedder model...");
    });
    this.logger?.info("RAG embedder model loaded.");

    await this.precomputeEmbeddings();
  }

  private async loadAndParseIndex(): Promise<void> {
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
      this.chunks = JSON.parse(data.toString()) as StoredChunk[];
    } catch (err) {
      throw new Error(`Failed to parse RAG index at ${resolved}: ${(err as Error).message}`);
    }
    this.logger?.info({ count: this.chunks.length, indexPath: resolved }, "Loaded RAG curriculum index");
  }

  private async precomputeEmbeddings(): Promise<void> {
    if (!this.embedder) {
      throw new Error("Embedder not initialized.");
    }

    this.logger?.info("Generating embeddings for RAG chunks. This may take a moment...");
    const textsToEmbed = this.chunks.map(chunk => chunk.content);
    const embeddings = await this.embedder(textsToEmbed, { pooling: "mean", normalize: true });

    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].embedding = Array.from(embeddings.data.slice(i * 384, (i + 1) * 384));
    }

    this.logger?.info("Embeddings generated for all RAG chunks.");
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
    if (!this.chunks.length || !this.embedder) {
      return [];
    }

    // 1. Filter chunks by metadata
    const filtered = this.chunks.filter(
      (chunk) =>
        !!chunk.embedding && // Ensure chunk has an embedding
        chunk.gradeBand === options.gradeBand &&
        (options.subjects.length === 0 || options.subjects.includes(chunk.subject)) &&
        (!options.sourceTypes?.length || (chunk.sourceType && options.sourceTypes.includes(chunk.sourceType)))
    );

    if (filtered.length === 0) {
      return [];
    }

    // 2. Generate embedding for the query
    const queryEmbedding = await this.embedder(query, { pooling: "mean", normalize: true });

    // 3. Calculate cosine similarity and score chunks
    const scored = filtered.map((chunk) => {
      const score = cos_sim(queryEmbedding.data, chunk.embedding!);
      return { chunk, score };
    });

    // 4. Sort by score and return the top results
    const sorted = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit)
      .map(({ chunk }) => chunk);


    if (!options.includeSources) {
      return sorted.map(({ source, ...rest }) => rest);
    }
    return sorted;
  }
}