export interface EvaluationResult {
  accuracy: number;
  loss: number;
  perplexity: number;
  diversity: number;
  bleuScore: number;
  confusionMatrix: number[][];
  categoryMetrics: CategoryMetrics[];
}

export interface CategoryMetrics {
  category: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface PredictionResult {
  input: string;
  target: string;
  prediction: string;
  correct: boolean;
  confidence: number;
}

export class EvaluationEngine {
  private categories: Set<string> = new Set();

  evaluate(predictions: PredictionResult[]): EvaluationResult {
    if (predictions.length === 0) {
      return this.createEmptyResult();
    }

    const correct = predictions.filter(p => p.correct).length;
    const accuracy = correct / predictions.length;
    
    const loss = this.calculateLoss(predictions);
    const perplexity = this.calculatePerplexity(predictions);
    const diversity = this.calculateDiversity(predictions);
    const bleuScore = this.calculateBLEU(predictions);
    const confusionMatrix = this.buildConfusionMatrix(predictions);
    const categoryMetrics = this.calculateCategoryMetrics(predictions);

    return {
      accuracy,
      loss,
      perplexity,
      diversity,
      bleuScore,
      confusionMatrix,
      categoryMetrics
    };
  }

  private createEmptyResult(): EvaluationResult {
    return {
      accuracy: 0,
      loss: 0,
      perplexity: 0,
      diversity: 0,
      bleuScore: 0,
      confusionMatrix: [],
      categoryMetrics: []
    };
  }

  private calculateLoss(predictions: PredictionResult[]): number {
    let totalLoss = 0;
    
    for (const pred of predictions) {
      const similarity = this.calculateSimilarity(pred.target, pred.prediction);
      totalLoss += 1 - similarity;
    }
    
    return totalLoss / predictions.length;
  }

  private calculatePerplexity(predictions: PredictionResult[]): number {
    let totalLogProb = 0;
    let totalWords = 0;
    
    for (const pred of predictions) {
      const targetWords = pred.target.split(' ').length;
      const predWords = pred.prediction.split(' ').length;
      totalWords += Math.max(targetWords, predWords);
      
      const similarity = this.calculateSimilarity(pred.target, pred.prediction);
      totalLogProb += Math.log(similarity + 0.0001);
    }
    
    if (totalWords === 0) return 0;
    
    const avgLogProb = totalLogProb / totalWords;
    return Math.exp(-avgLogProb);
  }

  private calculateDiversity(predictions: PredictionResult[]): number {
    if (predictions.length < 2) return 0;
    
    const predictionsSet = new Set(predictions.map(p => p.prediction));
    return predictionsSet.size / predictions.length;
  }

  private calculateBLEU(predictions: PredictionResult[]): number {
    let totalBleu = 0;
    
    for (const pred of predictions) {
      totalBleu += this.calculateSingleBLEU(pred.target, pred.prediction);
    }
    
    return totalBleu / predictions.length;
  }

  private calculateSingleBLEU(reference: string, candidate: string): number {
    const refNgrams = this.getNgrams(reference, 2);
    const candNgrams = this.getNgrams(candidate, 2);
    
    let overlap = 0;
    for (const ngram of candNgrams) {
      if (refNgrams.has(ngram)) {
        overlap++;
      }
    }
    
    if (candNgrams.size === 0) return 0;
    
    const precision = overlap / candNgrams.size;
    const brevityPenalty = reference.length <= candidate.length ? 1 : 
      Math.exp(1 - reference.length / candidate.length);
    
    return brevityPenalty * precision;
  }

  private getNgrams(text: string, n: number): Set<string> {
    const words = text.split('');
    const ngrams = new Set<string>();
    
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.add(words.slice(i, i + n).join(''));
    }
    
    return ngrams;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const longerLength = longer.length;
    const editDistance = this.editDistance(longer, shorter);
    
    return (longerLength - editDistance) / longerLength;
  }

  private editDistance(str1: string, str2: string): number {
    const costs: number[] = [];
    
    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[str2.length] = lastValue;
      }
    }
    
    return costs[str2.length];
  }

  private buildConfusionMatrix(_predictions: PredictionResult[]): number[][] {
    const categoryList = Array.from(this.categories);
    const matrix: number[][] = Array(categoryList.length)
      .fill(null)
      .map(() => Array(categoryList.length).fill(0));
    
    return matrix;
  }

  private calculateCategoryMetrics(_predictions: PredictionResult[]): CategoryMetrics[] {
    return [];
  }

  setCategories(categories: string[]): void {
    this.categories = new Set(categories);
  }

  calculateConfidence(target: string, prediction: string): number {
    return this.calculateSimilarity(target, prediction);
  }
}