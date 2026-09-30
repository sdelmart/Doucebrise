import * as THREE from 'three';

// Qui faut-il animer ? Un habitant ou un animal qui n'est ni dans le champ de la caméra,
// ni dans la zone de la carte d'ombres (son ombre pourrait entrer dans l'image), n'est
// dessiné nulle part : inutile de calculer sa pose. Le test est fait après la mise à jour
// de la caméra, pour l'image qui va être dessinée : dès qu'il redevient visible, il est
// animé avec tout le temps écoulé, sans image de retard. Image identique.

const _m = new THREE.Matrix4();
const _s = new THREE.Sphere();

export class ViewCull {
  constructor(camera, sun) {
    this.camera = camera;
    this.sun = sun;
    this.frustum = new THREE.Frustum();
    this.shadowFrustum = new THREE.Frustum();
    // Copie du cadre de la carte d'ombres (la lumière elle-même n'est pas touchée : ses
    // matrices servent à lire la carte d'ombres de l'image précédente).
    this.shadowCam = new THREE.OrthographicCamera();
    this.shadows = false;
    this.ready = false;
  }

  /** À appeler une fois par image, après la caméra et le soleil, avant le rendu. */
  update() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const sun = this.sun;
    this.shadows = !!sun?.castShadow;
    if (this.shadows) {
      const src = sun.shadow.camera;
      const sc = this.shadowCam;
      sc.left = src.left;
      sc.right = src.right;
      sc.top = src.top;
      sc.bottom = src.bottom;
      sc.near = src.near;
      sc.far = src.far;
      sc.zoom = src.zoom;
      sc.updateProjectionMatrix();
      // Soleil et cible sont à la racine de la scène : position locale = position monde.
      sc.position.copy(sun.position);
      sc.lookAt(sun.target.position);
      sc.updateMatrixWorld();
      this.shadowFrustum.setFromProjectionMatrix(_m.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse));
    }
    this.ready = true;
  }

  /** Une sphère (centre, rayon) peut-elle être dessinée, dans l'image ou dans les ombres ? */
  visible(center, radius) {
    if (!this.ready) return true;
    _s.center.copy(center);
    _s.radius = radius;
    return this.frustum.intersectsSphere(_s) || (this.shadows && this.shadowFrustum.intersectsSphere(_s));
  }
}
