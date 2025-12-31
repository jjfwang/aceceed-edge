export interface TtsProvider {
  synthesize(text: string): Promise<string>;
}
