# AI Module OpenAPI Swagger Specification

All AI routes are served under the `/api/ai` context. The following specification documents the request body and success structures.

```yaml
openapi: 3.0.3
info:
  title: FameHub LMS AI Engine API
  version: 1.0.0
  description: REST and WebSocket APIs powering artificial intelligence workflows.
paths:
  /api/ai/chat:
    post:
      summary: Send chat query to AI Companion
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - message
              properties:
                message:
                  type: string
                courseId:
                  type: string
                  nullable: true
      responses:
        '200':
          description: Chat response generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  response:
                    type: string

  /api/ai/generate-quiz:
    post:
      summary: Draft questions from past documents (Teachers/Admins only)
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - courseId
                - textContent
              properties:
                courseId:
                  type: string
                textContent:
                  type: string
      responses:
        '201':
          description: AI draft quiz questions created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  quiz:
                    type: object

  /api/ai/evaluate-assignment:
    post:
      summary: Evaluate student submissions for plagiarism and grading (Teachers/Admins only)
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - submissionId
                - studentSubmission
                - assignmentDescription
                - maxMarks
              properties:
                submissionId:
                  type: string
                studentSubmission:
                  type: string
                assignmentDescription:
                  type: string
                maxMarks:
                  type: integer
      responses:
        '200':
          description: Assessment generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  feedback:
                    type: object

  /api/ai/summarize-recording:
    post:
      summary: Summarize a lecture recording
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - meetingId
      responses:
        '200':
          description: Summary generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  summary:
                    type: object

  /api/ai/recommendations:
    post:
      summary: Fetch personalized focus study guides
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Personalization recommendations generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  recommendations:
                    type: object

  /api/ai/history:
    get:
      summary: Retrieve chat history context
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: History array
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  history:
                    type: array
                    items:
                      type: object

  /api/ai/metrics:
    get:
      summary: Get AI Token telemetry stats (Admins only)
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Token statistics
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  metrics:
                    type: object
```
