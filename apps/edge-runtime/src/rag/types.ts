import type { GradeBand, RagChunk } from "@aceceed/shared";

export interface RagRetriever {
  retrieve(
    query: string,
    options: {
      gradeBand: GradeBand;
      subjects: string[];
      limit: number;
      includeSources?: boolean;
    }
  ): Promise<RagChunk[]>;
}

export interface RagStoreLoader {
  load(): Promise<RagChunk[]>;
}
