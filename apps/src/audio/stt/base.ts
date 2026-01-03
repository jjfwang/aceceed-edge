export interface SttProvider {
  transcribe(audioPath: string): Promise<string>;
}
