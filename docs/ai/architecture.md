# FameHub AI Architecture

FameHub LMS incorporates a modular, robust, and highly scalable AI architecture that enhances teaching, learning, administration, and performance analytics. 

## Component Overview

```mermaid
graph TD
    UI[Frontend Dashboard Pages] -->|REST APIs / WebSockets| Server[Express.js Server]
    Server -->|Router/Controller| AIC[AI Controllers]
    
    subgraph AI Service Layer
        AIC --> CS[ChatService]
        AIC --> QG[QuizGenerator]
        AIC --> AE[AssignmentEvaluator]
        AIC --> RS[RecommendationService]
        AIC --> LS[LectureSummarizer]
        AIC --> SS[SemanticSearch]
    end

    subgraph Provider Wrapper
        CS & QG & AE & RS & LS & SS --> ProviderIndex[Providers/index.js]
        ProviderIndex --> OpenAI[OpenAI wrapper]
        ProviderIndex --> Gemini[Gemini wrapper]
        ProviderIndex --> Ollama[Ollama wrapper]
        ProviderIndex --> Mock[Mock Fallback wrapper]
    end
    
    subgraph Event Broker
        AIC -->|Kafka Events| Kafka[Apache Kafka]
    end
    
    subgraph DB Storage
        AI_Models[AIChatHistory, AISummary, AIRecommendations, AIQuizGeneration, AIFeedback, AIMetrics]
        AIC -.->|Sequelize Models| AI_Models
    end
```

### 1. Modular Provider Layer (`backend/src/ai/providers/`)
FameHub wraps provider SDKs in a unified interface exposing three core primitives:
* `getProviderName()`: Returns the configured provider (`openai`, `gemini`, `ollama`, or fallback `mock`).
* `chat(messages, options)`: Sends standard chat array payloads to LLMs and returns string responses or streams.
* `embed(text)`: Computes vector embeddings (float arrays) for semantic indexing.

### 2. Core AI Services (`backend/src/ai/services/`)
* **ChatService**: Manages student assistant histories and channels raw token streams via WebSockets.
* **QuizGenerator**: Reads pasted reference documentation to draft MCQs, multi-selects, and true/false questions.
* **AssignmentEvaluator**: Compares student responses with assignment descriptions and returns suggested grades, critiques, and plagiarism scores.
* **RecommendationService**: Dynamically reads attendance statistics, quiz logs, and assignment records to construct personalization plans.
* **LectureSummarizer**: Uses lecture recordings and transcript details to create revision questions, abstracts, key concepts, and study notes.
* **SemanticSearch**: Ranks reference items by computing cosine similarities between queries and document embeddings.

### 3. Kafka & WebSockets
* All major AI workflows emit structured messages to Zookeeper/Kafka event buses (e.g. `ai-chat-events`, `ai-quiz-events`, `ai-feedback-events`, `ai-summary-events`).
* Collaborative assistant interfaces rely on lightweight WebSockets to stream partial completions instantly to user dashboards with typing indicators.
