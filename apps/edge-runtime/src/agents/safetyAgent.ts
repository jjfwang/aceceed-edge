const bannedPhrases = [
  "violence",
  "weapon",
  "adult",
  "explicit",
  "self-harm"
];

export class SafetyAgent {
  guard(text: string): string {
    const lower = text.toLowerCase();
    if (bannedPhrases.some((phrase) => lower.includes(phrase))) {
      return "I can't help with that. Let's focus on a safe learning topic.";
    }

    const trimmed = text.replace(/\s+/g, " ").trim();
    const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
    const short = sentences.slice(0, 2).join(" ");

    if (short.length > 400) {
      return short.slice(0, 400).trim();
    }

    return short;
  }
}
