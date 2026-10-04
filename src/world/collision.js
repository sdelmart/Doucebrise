// Collisions simples dans le plan XZ : cercles (arbres, rochers) et boîtes orientées
// (maisons, stands). Grille spatiale pour ne tester que les obstacles proches.

const CELL = 8;

export class Colliders {
  constructor() {
    this.grid = new Map();
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  remove(c) {
    for (const list of this.grid.values()) {
      const i = list.indexOf(c);
      if (i >= 0) list.splice(i, 1);
    }
    this.onChange?.(c.x, c.z, c.type === 'circle' ? c.r : Math.hypot(c.hw, c.hd));
  }

  insert(c, radius) {
    const minX = Math.floor((c.x - radius) / CELL);
    const maxX = Math.floor((c.x + radius) / CELL);
    const minZ = Math.floor((c.z - radius) / CELL);
    const maxZ = Math.floor((c.z + radius) / CELL);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const k = this.key(x, z);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(c);
      }
    }
    // Grille de déplacement des animaux (world/navgrid.js) : cases à réévaluer.
    this.onChange?.(c.x, c.z, radius);
  }

  addCircle(x, z, r) {
    const c = { type: 'circle', x, z, r };
    this.insert(c, r);
    return c;
  }

  /** Boîte de demi-tailles (hw, hd) tournée de `rot` autour de Y. */
  addBox(x, z, hw, hd, rot = 0) {
    const c = { type: 'box', x, z, hw, hd, cos: Math.cos(rot), sin: Math.sin(rot) };
    this.insert(c, Math.hypot(hw, hd));
    return c;
  }

  /** Repousse un cercle (x, z, r) hors des obstacles. Retourne la position corrigée. */
  resolve(x, z, r) {
    const out = { x, z };
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const seen = new Set();
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const list = this.grid.get(this.key(cx + i, cz + j));
        if (!list) continue;
        for (const c of list) {
          if (seen.has(c)) continue;
          seen.add(c);
          if (c.type === 'circle') {
            const dx = out.x - c.x;
            const dz = out.z - c.z;
            const d = Math.hypot(dx, dz);
            const min = c.r + r;
            if (d < min && d > 1e-5) {
              out.x = c.x + (dx / d) * min;
              out.z = c.z + (dz / d) * min;
            }
          } else {
            // Passage en repère local de la boîte (rotation inverse).
            const dx = out.x - c.x;
            const dz = out.z - c.z;
            const lx = dx * c.cos - dz * c.sin;
            const lz = dx * c.sin + dz * c.cos;
            const qx = Math.max(-c.hw, Math.min(c.hw, lx));
            const qz = Math.max(-c.hd, Math.min(c.hd, lz));
            let ex = lx - qx;
            let ez = lz - qz;
            let d = Math.hypot(ex, ez);
            let nlx = lx;
            let nlz = lz;
            if (d < 1e-5) {
              // À l'intérieur : sortir par le côté le plus proche.
              const px = c.hw - Math.abs(lx);
              const pz = c.hd - Math.abs(lz);
              if (px < pz) nlx = Math.sign(lx || 1) * (c.hw + r);
              else nlz = Math.sign(lz || 1) * (c.hd + r);
            } else if (d < r) {
              nlx = qx + (ex / d) * r;
              nlz = qz + (ez / d) * r;
            } else {
              continue;
            }
            out.x = c.x + nlx * c.cos + nlz * c.sin;
            out.z = c.z - nlx * c.sin + nlz * c.cos;
          }
        }
      }
    }
    return out;
  }
}
