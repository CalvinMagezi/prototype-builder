export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';
export const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
export const DEFAULT_MODEL = 'gemini-1.5-flash';
export const DEFAULT_PROVIDER = 'Google Generative AI';
export const MODEL_LIST = [
  { name: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'Google Generative AI' },
  { name: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'Google Generative AI' },
  { name: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { name: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
];
