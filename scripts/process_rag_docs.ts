#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import type { GradeBand, RagChunk } from "../packages/shared/src/index.js";

const program = new Command();

program
  .name("process-rag-docs")
  .description("CLI to process raw text documents into a RAG JSON index")
  .requiredOption("-i, --inputDir <string>", "Directory containing .txt files to process")
  .requiredOption("-o, --outputFile <string>", "Path to write the output JSON file")
  .requiredOption("-s, --subject <string>", "The subject for this dataset (e.g., 'mathematics')")
  .requiredOption("-g, --gradeBand <string>", "The grade band (e.g., 'primary', 'secondary', 'jc')")
  .requiredOption("-t, --topic <string>", "The topic for this dataset (e.g., 'algebra')")
  .requiredOption("--sourceId <string>", "A unique identifier for the source document set");

program.parse(process.argv);

const options = program.opts();

const gradeBands: GradeBand[] = ["primary", "secondary", "jc"];
if (!gradeBands.includes(options.gradeBand as GradeBand)) {
  console.error(`Error: Invalid grade band. Must be one of: ${gradeBands.join(", ")}`);
  process.exit(1);
}

async function createRagIndex() {
  console.log(`Processing files from: ${options.inputDir}`);
  const allChunks: RagChunk[] = [];
  try {
    const files = await fs.readdir(options.inputDir);
    for (const file of files) {
      if (path.extname(file) !== ".txt") {
        console.log(`Skipping non-txt file: ${file}`);
        continue;
      }
      console.log(`Processing file: ${file}`);
      const filePath = path.join(options.inputDir, file);
      const content = await fs.readFile(filePath, "utf-8");

      // Simple chunking strategy: split by paragraphs (double newline)
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      let chunkIdCounter = 0;
      for (const paragraph of paragraphs) {
        const chunk: RagChunk = {
          chunkId: `${options.sourceId}-${chunkIdCounter++}`,
          sourceId: options.sourceId,
          content: paragraph.trim(),
          gradeBand: options.gradeBand,
          subject: options.subject,
          topic: options.topic,
          sourceType: 'textbook', // Or make this another option
          tags: [],
        };
        allChunks.push(chunk);
      }
    }

    await fs.writeFile(options.outputFile, JSON.stringify(allChunks, null, 2));
    console.log(`✅ Successfully created RAG index with ${allChunks.length} chunks at: ${options.outputFile}`);

  } catch (error) {
    console.error("Error during processing:", error);
    process.exit(1);
  }
}

createRagIndex();
