// Recalcul des positions : à chaque image, three.js recalcule la matrice de chaque objet
// de la scène, même caché. Près de la moitié des ~2 900 objets sont des animaux et des
// habitants trop loin pour être affichés, ou la végétation des îles lointaines : pour ces
// grands groupes, on saute les enfants cachés (rien n'y est dessiné). Dès qu'un enfant
// réapparaît, tout son contenu est recalculé avant d'être dessiné : image identique.
//
// Seuls les enfants directs du groupe sont concernés : les pièces invisibles qui servent
// d'os à un modèle affiché (voir rig.js) restent recalculées normalement.

const stale = new WeakSet();

/** Le groupe ne recalcule plus ses enfants cachés. Renvoie le groupe. */
export function skipHiddenChildren(group) {
  group.updateMatrixWorld = function updateMatrixWorld(force) {
    // Même début que Object3D.updateMatrixWorld (three.js).
    if (this.matrixAutoUpdate) this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) this.matrixWorld.copy(this.matrix);
        else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    const children = this.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child.visible) {
        stale.add(child);
        continue;
      }
      if (stale.has(child)) {
        stale.delete(child);
        child.updateMatrixWorld(true);
      } else {
        child.updateMatrixWorld(force);
      }
    }
  };
  return group;
}
