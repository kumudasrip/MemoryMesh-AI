import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Concept {
  id: string;
  label: string;
  frequency: number;
  density: number;
  degree: number;
  centrality: number;
  css: number;
  category: 'Strong' | 'Moderate' | 'Weak';
  occurrences: number[];
  insights: string[];
  actions: string[];
}

export interface Edge {
  source: string;
  target: string;
  similarity: number;
}

export interface AnalysisResult {
  concepts: Concept[];
  edges: Edge[];
  totalWords: number;
  paragraphs: string[];
  stats: {
    avgCSS: number;
    weakCount: number;
    balance: number;
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'with', 'as', 'for', 'was', 'on', 'are', 'by', 'be', 'this', 'an', 'at', 'or', 'from', 'which', 'but', 'not', 'they', 'we', 'he', 'she', 'has', 'have', 'had', 'can', 'will', 'would', 'their', 'there', 'if', 'all', 'any', 'one', 'about', 'out', 'up', 'so', 'into', 'no', 'when', 'more', 'some', 'what', 'who', 'how', 'its', 'than', 'also', 'been', 'only', 'other', 'new', 'could', 'should', 'our', 'them', 'these', 'then', 'than', 'must', 'may', 'might'
]);

export function analyzeText(text: string): AnalysisResult {
  // Robust paragraph splitting: try double newline, then single newline if needed
  let paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length < 3) {
    paragraphs = text.split(/\n/).filter(p => p.trim().length > 50);
  }
  // If still too few, split by sentences or fixed length
  if (paragraphs.length < 3) {
    paragraphs = text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const totalWords = Math.max(words.length, 1);

  // 1. TF-IDF Extract top 12 concepts
  const wordFreq: Record<string, number> = {};
  const docFreq: Record<string, number> = {};
  const wordInParagraphs: Record<string, Set<number>> = {};

  paragraphs.forEach((p, i) => {
    const pWords = new Set(p.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
    pWords.forEach(w => {
      if (STOP_WORDS.has(w)) return;
      docFreq[w] = (docFreq[w] || 0) + 1;
      if (!wordInParagraphs[w]) wordInParagraphs[w] = new Set();
      wordInParagraphs[w].add(i);
    });
  });

  words.forEach(w => {
    if (STOP_WORDS.has(w)) return;
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });

  const tfidf = Object.keys(wordFreq).map(word => {
    const tf = wordFreq[word] / totalWords;
    const idf = Math.log(paragraphs.length / (docFreq[word] || 1));
    return { word, score: tf * idf, freq: wordFreq[word] };
  });

  const top12 = tfidf
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (top12.length === 0) {
    return {
      concepts: [],
      edges: [],
      totalWords,
      paragraphs,
      stats: { avgCSS: 0, weakCount: 0, balance: 0 }
    };
  }

  // 2. Semantic Similarity Matrix (Cosine Similarity based on Paragraph Co-occurrence)
  const edges: Edge[] = [];
  for (let i = 0; i < top12.length; i++) {
    for (let j = i + 1; j < top12.length; j++) {
      const w1 = top12[i].word;
      const w2 = top12[j].word;
      
      const set1 = wordInParagraphs[w1];
      const set2 = wordInParagraphs[w2];
      
      // Jaccard similarity as a proxy for semantic similarity in this context
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      const similarity = intersection.size / union.size;

      if (similarity > 0.30) {
        edges.push({ source: w1, target: w2, similarity });
      }
    }
  }

  // 3. Concept Strength Score (CSS)
  const conceptNodes: Concept[] = top12.map(item => {
    const word = item.word;
    const degree = edges.filter(e => e.source === word || e.target === word).length;
    const maxDegree = top12.length - 1;
    
    const density = item.freq / totalWords;
    const centrality = degree / maxDegree;

    // Normalize density for CSS calculation (relative to max density in top 12)
    const maxDensity = Math.max(...top12.map(t => t.freq / totalWords));
    const normDensity = density / maxDensity;

    const css = (0.6 * normDensity) + (0.4 * centrality);
    
    let category: 'Strong' | 'Moderate' | 'Weak' = 'Weak';
    if (css >= 0.80) category = 'Strong';
    else if (css >= 0.60) category = 'Moderate';

    const insights: string[] = [];
    const actions: string[] = [];

    if (category === 'Weak') {
      insights.push(`${item.word.charAt(0).toUpperCase() + item.word.slice(1)} is weakly integrated into your overall knowledge network.`);
      insights.push(`It connects to only ${degree} related concepts and shows lower structural depth compared to other topics.`);
      actions.push(`Review ${item.word} fundamentals`);
      actions.push(`Solve ${Math.floor(Math.random() * 5) + 3} mixed problems involving this topic`);
      actions.push(`Revisit relationships between ${item.word} and other concepts`);
    } else if (category === 'Moderate') {
      insights.push(`${item.word.charAt(0).toUpperCase() + item.word.slice(1)} plays a bridging role between multiple core concepts.`);
      insights.push(`While structurally connected, retention strength can be improved.`);
      actions.push(`Practice multi-topic problems`);
      actions.push(`Review advanced variations of ${item.word}`);
    } else {
      insights.push(`${item.word.charAt(0).toUpperCase() + item.word.slice(1)} is a core pillar of your current understanding.`);
      insights.push(`High density and connectivity indicate strong mastery.`);
      actions.push(`Maintain mastery through periodic review`);
      actions.push(`Use this concept to anchor new learning`);
    }

    return {
      id: word,
      label: word.charAt(0).toUpperCase() + word.slice(1),
      frequency: item.freq,
      density,
      degree,
      centrality,
      css,
      category,
      occurrences: Array.from(wordInParagraphs[word] || []),
      insights,
      actions
    };
  });

  const avgCSS = conceptNodes.reduce((acc, c) => acc + c.css, 0) / conceptNodes.length;
  const weakCount = conceptNodes.filter(c => c.category === 'Weak').length;
  
  // Variance of CSS
  const variance = conceptNodes.reduce((acc, c) => acc + Math.pow(c.css - avgCSS, 2), 0) / conceptNodes.length;

  return {
    concepts: conceptNodes,
    edges,
    totalWords,
    paragraphs,
    stats: {
      avgCSS,
      weakCount,
      balance: 1 - Math.sqrt(variance) // High balance means low variance
    }
  };
}
