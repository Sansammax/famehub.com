# AI Environment Configuration

Configure the following environment parameters in `backend/.env` to switch providers and adjust rate controls.

## Environment Variables

| Variable Name | Default Value | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | `mock` | `openai`, `gemini`, `ollama`, `mock` | The active LLM engine provider. |
| `OPENAI_API_KEY` | — | String | Developer API token from OpenAI Dashboard. Required if `AI_PROVIDER=openai`. |
| `GEMINI_API_KEY` | — | String | Developer API token from Google AI Studio. Required if `AI_PROVIDER=gemini`. |
| `OLLAMA_HOST` | `http://localhost:11434` | URL | Endpoint address for a local Ollama server. Required if `AI_PROVIDER=ollama`. |
| `OLLAMA_MODEL` | `llama3` | String | Model tag pulled locally on Ollama (e.g. `gemma2`, `mistral`). |
| `AI_RATE_LIMIT_WINDOW` | `900000` | Integer (ms) | Rate limit sliding window (15 minutes). |
| `AI_RATE_LIMIT_MAX` | `100` | Integer | Max request capacity allowed per IP within the window. |

## Fallback Rules
* If `AI_PROVIDER` is set to `openai` or `gemini` but their corresponding API keys are missing, the system prints a log warning and degrades to `mock` mode gracefully to prevent backend runtime errors.
* SQLite fallback is triggered when local PostgreSQL is unreachable, allowing tests and telemetry storage to run fully isolated.
