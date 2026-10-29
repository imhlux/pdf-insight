import type { ApiErrorCode } from '../../shared/schema'

// One error type for the whole app. Every code has a Polish message and a flag
// telling the UI whether "try again" makes sense for the same file.

export type ClientErrorCode =
  | 'file_type'
  | 'file_size'
  | 'file_empty'
  | 'pdf_invalid'
  | 'pdf_password'
  | 'no_text'
  | 'network'
  | 'timeout'
  | 'invalid_response'
  | 'config'

export type ErrorCode = ApiErrorCode | ClientErrorCode

export class AppError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code)
  }
}

const MESSAGES: Record<ErrorCode, string> = {
  file_type: 'To nie jest plik PDF. Wybierz plik z rozszerzeniem .pdf.',
  file_size: 'Plik jest za duży. Maksymalny rozmiar to 10 MB.',
  file_empty: 'Plik jest pusty.',
  pdf_invalid: 'Nie udało się otworzyć pliku. Może być uszkodzony.',
  pdf_password: 'Plik jest zabezpieczony hasłem. Usuń hasło i spróbuj ponownie.',
  no_text:
    'W pliku nie ma tekstu do analizy. To prawdopodobnie skan, a aplikacja odczytuje maksymalnie 4 strony skanów.',
  network: 'Brak połączenia z serwerem analizy. Sprawdź internet i spróbuj ponownie.',
  timeout: 'Analiza trwała zbyt długo. Spróbuj ponownie.',
  invalid_response: 'Serwer zwrócił dane w nieprawidłowym formacie. Spróbuj ponownie.',
  config: 'Aplikacja nie ma skonfigurowanego adresu API (VITE_API_URL).',
  bad_request: 'Serwer odrzucił żądanie. Spróbuj z innym plikiem.',
  forbidden_origin: 'Ta strona nie ma dostępu do API analizy.',
  payload_too_large: 'Dokument ma za dużo tekstu do analizy (limit to ok. 300 000 znaków).',
  rate_limited: 'Za dużo analiz w krótkim czasie. Odczekaj minutę i spróbuj ponownie.',
  ai_quota: 'Wyczerpano chwilowo limit darmowego API AI. Spróbuj ponownie za minutę.',
  ai_unavailable: 'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.',
  ai_invalid_response:
    'Model AI dwa razy zwrócił dane niezgodne ze schematem. Spróbuj ponownie lub użyj innego pliku.',
  internal: 'Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie.',
}

// Errors where the same file will fail again, so only "choose another file" is offered.
const NOT_RETRYABLE = new Set<ErrorCode>([
  'file_type',
  'file_size',
  'file_empty',
  'pdf_invalid',
  'pdf_password',
  'no_text',
  'payload_too_large',
  'config',
  'forbidden_origin',
])

export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code]
}

export function isRetryable(code: ErrorCode): boolean {
  return !NOT_RETRYABLE.has(code)
}

export function toErrorCode(error: unknown): ErrorCode {
  return error instanceof AppError ? error.code : 'internal'
}
