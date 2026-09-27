import * as THREE from 'three';
import { TERRAIN_SIZE, SEA_FLOOR } from './terrain.js';
import { globalUniforms } from '../core/materials.js';
import { ISLANDS } from './layout.js';

// Eau stylisée : couleur selon la profondeur, écume animée sur les rivages,
// petits reflets scintillants. La profondeur vient de la texture de hauteur du terrain.

export function createWater(terrain, sky) {
  const uniforms = {
    uTime: globalUniforms.uTime,
    uHeight: { value: terrain.createHeightTexture() },
    uSize: { value: TERRAIN_SIZE },
    uFloor: { value: SEA_FLOOR },
    uShallow: { value: new THREE.Color('#8fe3e0') },
    uDeep: { value: new THREE.Color('#3f9fd6') },
    uFar: { value: new THREE.Color('#4aa6dc') },
    uLight: { value: new THREE.Color('#ffffff') },
    uSky: { value: new THREE.Color('#d4f1fd') },
    uSkyTop: { value: new THREE.Color('#6fc4f5') },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffffff') },
    uReflect: { value: 1 },
    uLagoon: { value: new THREE.Vector3(ISLANDS.corail.x, ISLANDS.corail.z, ISLANDS.corail.r) },
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 1 },
    fogFar: { value: 1000 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        wp.y += sin(wp.x * 0.15 + uTime * 0.9) * 0.05 + cos(wp.z * 0.13 + uTime * 0.7) * 0.05;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uHeight; uniform float uSize; uniform float uFloor;
      uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFar; uniform vec3 uLight; uniform vec3 uSky;
      uniform vec3 uSkyTop; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uReflect; uniform vec3 uLagoon;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 uv = (vWorld.xz + uSize * 0.5) / uSize;
        float ground = uFloor;
        if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
          ground = texture2D(uHeight, uv).r * 16.0 + uFloor;
        }
        float depth = max(0.0 - ground, 0.0);
        // Eaux turquoise autour de l'île Corail.
        float lag = smoothstep(uLagoon.z * 1.5, uLagoon.z * 0.7, distance(vWorld.xz, uLagoon.xy));
        vec3 shallow = mix(uShallow, vec3(0.45, 0.93, 0.86), lag);
        vec3 deep = mix(uDeep, vec3(0.12, 0.66, 0.78), lag);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 4.5 + lag * 2.0, depth));
        col = mix(col, uFar, smoothstep(5.0, 8.0, depth) * (1.0 - lag * 0.5));
        // Motif de vaguelettes.
        float n = noise(vWorld.xz * 0.35 + vec2(uTime * 0.25, uTime * 0.18));
        float n2 = noise(vWorld.xz * 0.9 - vec2(uTime * 0.3, -uTime * 0.2));
        col += (smoothstep(0.62, 0.8, n * 0.6 + n2 * 0.5) * 0.12) * uLight;
        // Reflets du ciel (plus forts en regardant loin) et éclat du soleil.
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = normalize(vec3((n - 0.5) * 0.35 + (n2 - 0.5) * 0.2, 1.0, (n2 - 0.5) * 0.35 - (n - 0.5) * 0.1));
        float fres = pow(1.0 - max(dot(V, N), 0.0), 4.0);
        vec3 skyCol = mix(uSky, uSkyTop, 0.35);
        col = mix(col, skyCol, clamp(fres, 0.0, 1.0) * 0.6 * uReflect);
        float spec = pow(max(dot(reflect(-uSunDir, N), V), 0.0), 220.0) * step(0.0, uSunDir.y);
        // Écume du rivage (bandes qui respirent).
        float band = sin(depth * 9.0 - uTime * 1.6 + n * 3.0) * 0.5 + 0.5;
        float foam = smoothstep(0.55, 0.05, depth) + smoothstep(0.9, 0.2, depth) * smoothstep(0.7, 0.95, band) * 0.8;
        foam = clamp(foam, 0.0, 1.0);
        // Scintillements.
        float sparkle = smoothstep(0.93, 0.99, noise(vWorld.xz * 2.2 + uTime * 0.6)) * smoothstep(0.5, 2.0, depth);
        col = mix(col, vec3(1.0), foam * 0.85);
        col += sparkle * 0.35 * uLight;
        col += uSunColor * spec * 2.2 * uReflect * (1.0 - foam);
        col *= mix(vec3(1.0), uLight, 0.65);
        float alpha = mix(0.55, 0.9, smoothstep(0.0, 3.0, depth));
        alpha = max(alpha, foam * 0.95);
        gl_FragColor = vec4(col * 0.82, alpha); // atténué pour le rendu ACES (voir sky.js)
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });

  const geo = new THREE.PlaneGeometry(900, 900, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  mesh.renderOrder = 2;
  mesh.name = 'water';

  const nightTint = new THREE.Color('#5b6bb0');
  mesh.userData.update = () => {
    // Teinte de l'eau selon la lumière du moment (plus sombre la nuit).
    const nf = sky.nightFactor;
    uniforms.uLight.value.setRGB(1, 1, 1).lerp(nightTint, nf * 0.8);
    uniforms.uSky.value.copy(sky.domeUniforms.uHorizon.value);
    uniforms.uSkyTop.value.copy(sky.domeUniforms.uTop.value);
    const up = sky.sunDir.y > 0.02;
    uniforms.uSunDir.value.copy(up ? sky.sunDir : sky.moonDir);
    uniforms.uSunColor.value.copy(sky.sunColor).multiplyScalar(up ? 1 : 0.35 * nf);
  };
  mesh.userData.uniforms = uniforms;
  return mesh;
}
