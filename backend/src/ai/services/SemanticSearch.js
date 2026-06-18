import { embed } from '../providers/index.js';
import { Course, Assignment, Quiz } from '../../../models/index.js';

export class SemanticSearch {
  static async search(query, limit = 5) {
    const [courses, assignments, quizzes] = await Promise.all([
      Course.findAll({ attributes: ['id', 'title', 'description'] }),
      Assignment.findAll({ attributes: ['id', 'title', 'description'] }),
      Quiz.findAll({ attributes: ['id', 'title', 'description'] })
    ]);

    const documents = [];

    courses.forEach(c => {
      documents.push({
        id: c.id,
        type: 'Course',
        title: c.title,
        content: `${c.title}. ${c.description || ''}`.trim(),
        url: `/#/courses/${c.id}`
      });
    });

    assignments.forEach(a => {
      documents.push({
        id: a.id,
        type: 'Assignment',
        title: a.title,
        content: `${a.title}. ${a.description || ''}`.trim(),
        url: `/#/assignments/${a.id}`
      });
    });

    quizzes.forEach(q => {
      documents.push({
        id: q.id,
        type: 'Quiz',
        title: q.title,
        content: `${q.title}. ${q.description || ''}`.trim(),
        url: `/#/quizzes/${q.id}`
      });
    });

    if (documents.length === 0) return [];

    const queryVector = await embed(query);

    const results = await Promise.all(documents.map(async (doc) => {
      const docVector = await embed(doc.content);
      let score = cosineSimilarity(queryVector, docVector);

      // Boost score if direct text matches occur (helpful in mock environments)
      const queryWords = query.toLowerCase().split(/\s+/);
      let matchCount = 0;
      queryWords.forEach(word => {
        if (word.length > 2 && doc.content.toLowerCase().includes(word)) {
          matchCount++;
        }
      });
      if (matchCount > 0) {
        score += (matchCount * 0.15);
      }

      return {
        ...doc,
        score: Math.min(1.0, score)
      };
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export default SemanticSearch;
