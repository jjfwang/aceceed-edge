const bannedPhrases = [
  "violence",
  "weapon",
  "adult",
  "explicit",
  "self-harm",
  "suicide",
  "kill",
  "threat",
  "terror",
  "hate",
  "bully"
];

export class SafetyAgent {
  guard(text: string): string {
    const lower = text.toLowerCase();
    if (bannedPhrases.some((phrase) => lower.includes(phrase))) {
      return "I can't help with that. Let's focus on a safe learning topic.";
    }
    return text.replace(/\s+/g, " ").trim();
  }
}
