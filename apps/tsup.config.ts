import { promises as fs } from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

async function copyPromptFiles() {
  const srcDir = path.join(__dirname, "src", "llm", "prompts");
  const destDir = path.join(__dirname, "dist", "llm", "prompts");

  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir);
  const txtFiles = entries.filter((entry) => entry.endsWith(".txt"));

  await Promise.all(
    txtFiles.map((entry) => fs.copyFile(path.join(srcDir, entry), path.join(destDir, entry)))
  );
}

const copyPromptsPlugin = {
  name: "copy-prompts",
  setup(build: { onEnd: (cb: () => void | Promise<void>) => void }) {
    build.onEnd(async () => {
      await copyPromptFiles();
    });
  }
};

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
  esbuildPlugins: [copyPromptsPlugin]
});
