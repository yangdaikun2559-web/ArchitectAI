import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function localTokenSimilarity(textA: string, textB: string): number {
  const cleanTokens = (text: string) => {
    const tokens = new Set<string>();
    const parts = text.toLowerCase().split(/[\s,，.。;；:：、()（）+-_/*]+/g).filter(Boolean);
    for (const part of parts) {
      let i = 0;
      while (i < part.length) {
        const charCode = part.charCodeAt(i);
        if (charCode >= 0x4e00 && charCode <= 0x9fff) {
          tokens.add(part[i]);
          i++;
        } else {
          let start = i;
          while (i < part.length && !(part.charCodeAt(i) >= 0x4e00 && part.charCodeAt(i) <= 0x9fff)) {
            i++;
          }
          tokens.add(part.slice(start, i));
        }
      }
    }
    return tokens;
  };
  const setA = cleanTokens(textA);
  const setB = cleanTokens(textB);
  
  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }
  
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export class RagEngine {
  private ai: GoogleGenAI;
  private hasValidKey: boolean;
  private embeddingsCache: Record<string, number[]> = {};
  private cachePath: string;

  constructor(ai: GoogleGenAI, hasValidKey: boolean) {
    this.ai = ai;
    this.hasValidKey = hasValidKey;
    this.cachePath = path.join(process.cwd(), "data", "embeddings.json");
    this.loadCache();
  }

  private loadCache() {
    if (fs.existsSync(this.cachePath)) {
      try {
        const raw = fs.readFileSync(this.cachePath, "utf-8");
        this.embeddingsCache = JSON.parse(raw);
      } catch (err) {
        console.error("Failed to load embeddings cache:", err);
      }
    }
  }

  private saveCache() {
    try {
      const dataDir = path.dirname(this.cachePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(this.embeddingsCache, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save embeddings cache:", err);
    }
  }

  private getComponentDoc(comp: any): string {
    const parts = [
      `名称: ${comp.name}`,
      `类别: ${comp.category || ""}`,
      `类型: ${comp.type || ""}`,
      `描述: ${comp.description || ""}`
    ];
    if (comp.drivers && comp.drivers.apiDocumentation) {
      parts.push(`API文档: ${comp.drivers.apiDocumentation}`);
    }
    return parts.join("。");
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.hasValidKey) {
      throw new Error("API Key is missing or invalid");
    }
    const response = await this.ai.models.embedContent({
      model: "text-embedding-004",
      contents: text
    });
    if (response && response.embeddings && response.embeddings[0] && response.embeddings[0].values) {
      return response.embeddings[0].values;
    }
    throw new Error("Failed to retrieve embedding values");
  }

  public async warmup(components: any[]) {
    if (!this.hasValidKey) {
      console.log("[RAG Engine] API key not configured, skipping vector warmup.");
      return;
    }
    
    console.log("[RAG Engine] Warming up embeddings cache...");
    let updated = false;
    for (const comp of components) {
      if (!this.embeddingsCache[comp.id] && comp.active) {
        const doc = this.getComponentDoc(comp);
        console.log(`[RAG Engine] Creating embedding for component: ${comp.name}...`);
        try {
          const vector = await this.getEmbedding(doc);
          this.embeddingsCache[comp.id] = vector;
          updated = true;
        } catch (err) {
          console.warn(`[RAG Engine] Embedding creation failed for ${comp.name}:`, err);
        }
      }
    }
    
    if (updated) {
      this.saveCache();
      console.log("[RAG Engine] Embeddings cache successfully updated.");
    } else {
      console.log("[RAG Engine] Embeddings cache is up-to-date.");
    }
  }

  public async retrieve(query: string, components: any[], k: number = 5): Promise<any[]> {
    if (!Array.isArray(components) || components.length === 0) {
      return [];
    }

    const activeComponents = components.filter(c => c.active);
    const scoredList: { comp: any; score: number }[] = [];
    
    let useVector = this.hasValidKey;
    let queryVector: number[] = [];
    
    if (useVector) {
      try {
        queryVector = await this.getEmbedding(query);
      } catch (err) {
        console.warn("[RAG Engine] Query embedding failed. Falling back to local word overlaps matcher.");
        useVector = false;
      }
    }

    for (const comp of activeComponents) {
      let score = 0;
      if (useVector && this.embeddingsCache[comp.id]) {
        score = cosineSimilarity(queryVector, this.embeddingsCache[comp.id]);
      } else {
        const doc = this.getComponentDoc(comp);
        score = localTokenSimilarity(query, doc);
      }
      scoredList.push({ comp, score });
    }

    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.slice(0, k).map(x => x.comp);
  }
}
