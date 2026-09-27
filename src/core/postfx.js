import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

// Post-traitement : halo lumineux (bloom) qui fait briller lanternes, fenêtres et
// étoiles la nuit, étalonnage doux (saturation, chaleur, vignette) et anticrénelage.
// En qualité basse, tout est désactivé : rendu direct, le plus rapide possible.

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.24 },
    uContrast: { value: 1.04 },
    uWarm: { value: 0.02 },
    uVignette: { value: 0.28 },
    uLift: { value: new THREE.Color(0, 0, 0) },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uSaturation; uniform float uContrast; uniform float uWarm;
    uniform float uVignette; uniform vec3 uLift; uniform float uFlash;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = max(tex.rgb, 0.0);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Saturation, sans jamais passer sous zéro : pow() d'une valeur négative donne
      // du noir sur les vraies cartes graphiques (toits rouges, fruits…).
      c = max(mix(vec3(l), c, uSaturation), 0.0);
      // Contraste autour du gris moyen (espace linéaire).
      c = pow(c / 0.18, vec3(uContrast)) * 0.18;
      c += vec3(uWarm, uWarm * 0.35, -uWarm * 0.6) * l;
      c += uLift * (1.0 - smoothstep(0.0, 0.5, l));
      float d = distance(vUv, vec2(0.5));
      c *= mix(1.0, smoothstep(0.95, 0.25, d), uVignette);
      c += vec3(uFlash);
      gl_FragColor = vec4(c, tex.a);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.opts = { aa: 'off', bloom: false, grading: false, ao: false };
    this.composer = null;
    this.enabled = false;
    this.night = 0;
    // Ombres du soleil recalculées une image sur N (qualité automatique, petits ordinateurs).
    this.shadowEvery = 1;
    this.frameN = 0;
  }

  get active() {
    return this.enabled && !!this.composer;
  }

  configure(opts) {
    const same = this.composer && ['aa', 'bloom', 'grading', 'ao'].every((k) => this.opts[k] === opts[k]);
    this.opts = { ...this.opts, ...opts };
    this.enabled = this.opts.bloom || this.opts.grading || this.opts.ao || this.opts.aa === 'smaa' || this.opts.aa === 'fxaa' || this.opts.aa === 'msaa';
    if (same) return;
    this.dispose();
    if (!this.enabled) return;
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x * r.getPixelRatio(), size.y * r.getPixelRatio(), {
      type: THREE.HalfFloatType,
      samples: this.opts.aa === 'msaa' ? 4 : 0,
      // Profondeur de l'image, relue par l'occlusion ambiante (pas de second rendu de la scène).
      depthTexture: this.opts.ao ? new THREE.DepthTexture(size.x * r.getPixelRatio(), size.y * r.getPixelRatio()) : null,
    });
    const composer = new EffectComposer(r, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    // Ombres de contact : occlusion ambiante (GTAO) au pied des murs, sous les arbres,
    // entre les objets posés au sol.
    if (this.opts.ao) {
      this.ao = new GTAOPass(this.scene, this.camera, size.x, size.y);
      this.ao.output = GTAOPass.OUTPUT.Default;
      this.ao.blendIntensity = 0.85;
      this.ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 10 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
      // L'occlusion lit la profondeur de l'image qui vient d'être dessinée (normales
      // recalculées à partir d'elle) au lieu de redessiner toute la scène une seconde
      // fois : environ deux fois moins d'appels de dessin. (setGBuffer est appelé
      // après la construction : la passe crée alors ses cibles internes normalement.)
      const aoRender = this.ao.render.bind(this.ao);
      this.ao.render = (renderer, writeBuffer, readBuffer, ...rest) => {
        const depth = readBuffer.depthTexture;
        if (depth && this.ao.depthTexture !== depth) {
          this.ao.setGBuffer(depth);
          if (!this.aoFromDepth) {
            this.aoFromDepth = true;
            this.ao.gtaoMaterial.needsUpdate = true;
            this.ao.pdMaterial.needsUpdate = true;
          }
        }
        return aoRender(renderer, writeBuffer, readBuffer, ...rest);
      };
      composer.addPass(this.ao);
    }
    if (this.opts.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.55, 0.9);
      composer.addPass(this.bloom);
    }
    if (this.opts.grading) {
      this.grade = new ShaderPass(GradeShader);
      composer.addPass(this.grade);
    }
    composer.addPass(new OutputPass());
    if (this.opts.aa === 'fxaa') {
      this.fxaa = new ShaderPass(FXAAShader);
      composer.addPass(this.fxaa);
    } else if (this.opts.aa === 'smaa') {
      composer.addPass(new SMAAPass(size.x * r.getPixelRatio(), size.y * r.getPixelRatio()));
    }
    this.composer = composer;
    this.setSize(size.x, size.y);
  }

  setSize(w, h) {
    if (!this.composer) return;
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    // L'occlusion ambiante (très floue par nature) est calculée à demi-résolution :
    // près de trois fois moins chère, sans différence visible une fois lissée.
    if (this.ao) this.ao.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
    if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
  }

  /** Ambiance selon l'heure : plus de halo la nuit, un peu de chaleur au coucher du soleil. */
  setMood({ night = 0, golden = 0, flash = 0, fog = 0 } = {}) {
    this.night = night;
    if (this.bloom) {
      this.bloom.strength = 0.22 + night * 0.62;
      this.bloom.threshold = 0.92 - night * 0.42;
      this.bloom.radius = 0.5 + night * 0.2;
    }
    if (this.grade) {
      const u = this.grade.material.uniforms;
      // ACES désature un peu : on redonne des couleurs franches (ambiance cozy).
      u.uSaturation.value = 1.24 - fog * 0.15 + golden * 0.05;
      u.uContrast.value = 1.04 - fog * 0.04;
      u.uWarm.value = 0.012 + golden * 0.025 - night * 0.015;
      u.uVignette.value = 0.26 + night * 0.12;
      u.uLift.value.setRGB(0.004 * night, 0.006 * night, 0.018 * night);
      u.uFlash.value = flash;
    }
  }

  render(dt) {
    // Ombres du soleil : calculées une seule fois par image (voir game.js), ou une image
    // sur N quand la qualité automatique allège le rendu.
    if (dt === 0 || ++this.frameN >= this.shadowEvery) {
      this.frameN = 0;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.active) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (!this.composer) return;
    this.composer.renderTarget1?.dispose();
    this.composer.renderTarget2?.dispose();
    for (const p of this.composer.passes) p.dispose?.();
    this.composer = null;
    this.bloom = null;
    this.grade = null;
    this.fxaa = null;
    this.ao = null;
    this.aoFromDepth = false;
  }
}
