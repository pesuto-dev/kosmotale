import * as THREE from "three";
import { loadTexture } from "@/components/scene-materials";

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
}
`;

/**
 * NASA SVS Deep Star Maps 2020 (SVS 4851), zonder sterrenbeeldfiguren.
 * RA 0h in het midden, RA loopt naar links.
 * Licentie: LICENSES/sterrenkaart.txt. Geen Apache en geen NASA-publiek-domeinlabel.
 */
const SKY_FRAG = /* glsl */ `
uniform sampler2D uStars;
uniform float uBright;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float ra = atan(d.y, d.x);
  float u = fract(0.5 - ra / (2.0 * PI));
  float v = 0.5 + asin(clamp(d.z, -1.0, 1.0)) / PI;
  vec3 col = texture2D(uStars, vec2(u, v)).rgb * uBright;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

function darkSky() {
  const tex = new THREE.DataTexture(new Uint8Array([3, 4, 9, 255]), 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function skyMaterial() {
  const uniforms: Record<string, THREE.IUniform> = {
    uStars: { value: darkSky() },
    uBright: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: `#define PI 3.141592653589793\n${SKY_FRAG}`,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
  loadTexture(
    "sterren",
    (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      uniforms.uStars.value = t;
    },
    { mipmaps: false },
  );
  return mat;
}
