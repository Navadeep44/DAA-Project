/**
 * UnionFind (Disjoint Set Union) Data Structure
 * Supports path compression and union by rank.
 */
class UnionFind {
  constructor(elements = []) {
    this.parent = new Map();
    this.rank = new Map();

    elements.forEach(id => {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    });
  }

  /**
   * Add a new element to the set
   */
  makeSet(id) {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }

  /**
   * Find root of set containing x with path compression
   */
  find(x) {
    if (!this.parent.has(x)) {
      this.makeSet(x);
    }
    if (this.parent.get(x) !== x) {
      // Path compression
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }

  /**
   * Union the sets containing x and y using union by rank.
   * Returns true if merged, false if already in same set.
   */
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) {
      return false; // Cycle detected / already connected
    }

    const rankX = this.rank.get(rootX) || 0;
    const rankY = this.rank.get(rootY) || 0;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }

    return true;
  }

  /**
   * Check if x and y belong to the same component
   */
  connected(x, y) {
    return this.find(x) === this.find(y);
  }
}

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UnionFind };
} else {
  window.UnionFind = UnionFind;
}
