// Cheap, deterministic detector for text that tries to give orders to an AI.
// It does not block anything: the real defence is the prompt (document text
// is data, never instructions) plus schema validation. The detector only
// lets the UI tell the user that the file contained such a fragment.

const PATTERNS: RegExp[] = [
  /ignore (all |any )?(the )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (all |any )?(the )?(previous|prior|above)/i,
  /zignoruj (wszystkie |wszelkie )?(wcześniejsze|poprzednie|powyższe) (polecenia|instrukcje)/i,
  /instrukcj[aęi] dla (systemu |modelu )?(ai|sztucznej inteligencji|llm)/i,
  /(system|developer) prompt/i,
  /you are now /i,
  /jesteś teraz /i,
]

export function detectPromptInjection(text: string): boolean {
  return PATTERNS.some((pattern) => pattern.test(text))
}
