// 知识图谱类 - 管理概念之间的关系

interface KnowledgeNode {
  id: number;
  name: string;
  category: string;
  description: string;
  relatedNodes: number[];
  relationships: Map<number, Relationship>;
  importance: number; // 节点重要性 0-10
  lastUpdated: Date;
}

interface Relationship {
  type: string; // 关系类型
  strength: number; // 关系强度 0-1
  description: string; // 关系描述
  lastUpdated: Date;
}

interface Path {
  nodes: KnowledgeNode[];
  relationships: Relationship[];
  totalStrength: number;
  length: number;
}

export class KnowledgeGraph {
  private nodes: Map<number, KnowledgeNode>;
  private nextNodeId: number;

  constructor() {
    this.nodes = new Map();
    this.nextNodeId = 1;
  }

  // 添加节点
  addNode(name: string, category: string, description: string): KnowledgeNode {
    const node: KnowledgeNode = {
      id: this.nextNodeId++,
      name,
      category,
      description,
      relatedNodes: [],
      relationships: new Map(),
      importance: 5,
      lastUpdated: new Date()
    };
    this.nodes.set(node.id, node);
    return node;
  }

  // 添加关系
  addRelationship(fromNodeId: number, toNodeId: number, type: string, strength: number, description: string): Relationship {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);

    if (!fromNode || !toNode) {
      throw new Error('Node not found');
    }

    const relationship: Relationship = {
      type,
      strength: Math.min(1, Math.max(0, strength)),
      description,
      lastUpdated: new Date()
    };

    // 添加关系到源节点
    fromNode.relationships.set(toNodeId, relationship);
    if (!fromNode.relatedNodes.includes(toNodeId)) {
      fromNode.relatedNodes.push(toNodeId);
    }

    // 添加反向关系到目标节点
    const reverseRelationship: Relationship = {
      type: `反向${type}`,
      strength: Math.min(1, Math.max(0, strength * 0.8)), // 反向关系强度稍弱
      description: `反向关系: ${description}`,
      lastUpdated: new Date()
    };

    toNode.relationships.set(fromNodeId, reverseRelationship);
    if (!toNode.relatedNodes.includes(fromNodeId)) {
      toNode.relatedNodes.push(fromNodeId);
    }

    return relationship;
  }

  // 获取节点
  getNode(nodeId: number): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  // 搜索节点
  searchNodes(keyword: string): KnowledgeNode[] {
    const results: KnowledgeNode[] = [];
    this.nodes.forEach(node => {
      if (node.name.includes(keyword) || node.description.includes(keyword)) {
        results.push(node);
      }
    });
    return results;
  }

  // 获取相关节点
  getRelatedNodes(nodeId: number, limit: number = 5): KnowledgeNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }

    // 按关系强度排序
    const relatedNodeIds = node.relatedNodes
      .map(id => ({
        id,
        strength: node.relationships.get(id)?.strength || 0
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit)
      .map(item => item.id);

    return relatedNodeIds
      .map(id => this.nodes.get(id))
      .filter((node): node is KnowledgeNode => node !== undefined);
  }

  // 查找最短路径
  findShortestPath(fromNodeId: number, toNodeId: number): Path | null {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);

    if (!fromNode || !toNode) {
      return null;
    }

    // 简单的广度优先搜索
    const visited = new Set<number>();
    const queue: { node: KnowledgeNode; path: KnowledgeNode[]; relationships: Relationship[] }[] = [
      { node: fromNode, path: [fromNode], relationships: [] }
    ];

    while (queue.length > 0) {
      const { node, path, relationships } = queue.shift()!;

      if (node.id === toNodeId) {
        const totalStrength = relationships.reduce((sum, rel) => sum + rel.strength, 0);
        return {
          nodes: path,
          relationships,
          totalStrength,
          length: path.length - 1
        };
      }

      visited.add(node.id);

      node.relatedNodes.forEach(relatedId => {
        if (!visited.has(relatedId)) {
          const relatedNode = this.nodes.get(relatedId);
          const relationship = node.relationships.get(relatedId);
          if (relatedNode && relationship) {
            queue.push({
              node: relatedNode,
              path: [...path, relatedNode],
              relationships: [...relationships, relationship]
            });
          }
        }
      });
    }

    return null;
  }

  // 查找多跳关系
  findMultiHopRelationships(nodeId: number, depth: number = 2): Map<number, Path> {
    const results = new Map<number, Path>();
    const node = this.nodes.get(nodeId);

    if (!node) {
      return results;
    }

    // 递归查找多跳关系
    const search = (currentNode: KnowledgeNode, currentPath: KnowledgeNode[], currentRelationships: Relationship[], currentDepth: number) => {
      if (currentDepth >= depth) {
        return;
      }

      currentNode.relatedNodes.forEach(relatedId => {
        const relatedNode = this.nodes.get(relatedId);
        const relationship = currentNode.relationships.get(relatedId);
        if (relatedNode && relationship) {
          const newPath = [...currentPath, relatedNode];
          const newRelationships = [...currentRelationships, relationship];
          const totalStrength = newRelationships.reduce((sum, rel) => sum + rel.strength, 0);

          const path: Path = {
            nodes: newPath,
            relationships: newRelationships,
            totalStrength,
            length: newPath.length - 1
          };

          results.set(relatedId, path);
          search(relatedNode, newPath, newRelationships, currentDepth + 1);
        }
      });
    };

    search(node, [node], [], 0);
    return results;
  }

  // 计算节点之间的相似度
  calculateSimilarity(nodeId1: number, nodeId2: number): number {
    const node1 = this.nodes.get(nodeId1);
    const node2 = this.nodes.get(nodeId2);

    if (!node1 || !node2) {
      return 0;
    }

    // 基于共同相关节点计算相似度
    const commonRelatedNodes = node1.relatedNodes.filter(id => node2.relatedNodes.includes(id));
    const totalRelatedNodes = new Set([...node1.relatedNodes, ...node2.relatedNodes]).size;

    if (totalRelatedNodes === 0) {
      return 0;
    }

    // 基于关系强度计算相似度
    let similarity = commonRelatedNodes.length / totalRelatedNodes;

    // 基于类别计算相似度
    if (node1.category === node2.category) {
      similarity += 0.2;
    }

    // 基于描述的相似度（简单实现）
    if (node1.description.includes(node2.name) || node2.description.includes(node1.name)) {
      similarity += 0.1;
    }

    return Math.min(1, similarity);
  }

  // 更新节点重要性
  updateNodeImportance(nodeId: number, importance: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.importance = Math.min(10, Math.max(0, importance));
      node.lastUpdated = new Date();
    }
  }

  // 增强节点之间的关系
  strengthenRelationship(fromNodeId: number, toNodeId: number, strengthIncrease: number): void {
    const fromNode = this.nodes.get(fromNodeId);
    if (fromNode) {
      const relationship = fromNode.relationships.get(toNodeId);
      if (relationship) {
        relationship.strength = Math.min(1, relationship.strength + strengthIncrease);
        relationship.lastUpdated = new Date();
      }
    }
  }

  // 减弱节点之间的关系
  weakenRelationship(fromNodeId: number, toNodeId: number, strengthDecrease: number): void {
    const fromNode = this.nodes.get(fromNodeId);
    if (fromNode) {
      const relationship = fromNode.relationships.get(toNodeId);
      if (relationship) {
        relationship.strength = Math.max(0, relationship.strength - strengthDecrease);
        relationship.lastUpdated = new Date();
      }
    }
  }

  // 获取知识图谱统计信息
  getStats(): {
    totalNodes: number;
    totalRelationships: number;
    averageRelationshipsPerNode: number;
    categories: Set<string>;
  } {
    let totalRelationships = 0;
    const categories = new Set<string>();

    this.nodes.forEach(node => {
      totalRelationships += node.relationships.size;
      categories.add(node.category);
    });

    return {
      totalNodes: this.nodes.size,
      totalRelationships,
      averageRelationshipsPerNode: this.nodes.size > 0 ? totalRelationships / this.nodes.size : 0,
      categories
    };
  }

  // 从概念列表构建知识图谱
  buildFromConcepts(concepts: Array<{
    id: number;
    name: string;
    category: string;
    description: string;
    relatedConcepts: number[];
  }>): void {
    // 首先添加所有节点
    const nodeMap = new Map<number, KnowledgeNode>();
    concepts.forEach(concept => {
      const node = this.addNode(concept.name, concept.category, concept.description);
      nodeMap.set(concept.id, node);
    });

    // 然后添加关系
    concepts.forEach(concept => {
      const fromNode = nodeMap.get(concept.id);
      if (fromNode) {
        concept.relatedConcepts.forEach(relatedId => {
          const toNode = nodeMap.get(relatedId);
          if (toNode) {
            this.addRelationship(
              fromNode.id,
              toNode.id,
              '相关',
              0.5 + Math.random() * 0.5, // 随机强度
              `${fromNode.name}与${toNode.name}相关`
            );
          }
        });
      }
    });
  }

  private static instance: KnowledgeGraph;

  static getInstance(): KnowledgeGraph {
    if (!KnowledgeGraph.instance) {
      KnowledgeGraph.instance = new KnowledgeGraph();
    }
    return KnowledgeGraph.instance;
  }
}

export const knowledgeGraph = KnowledgeGraph.getInstance();
