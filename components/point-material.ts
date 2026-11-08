import * as THREE from "three";

/** Halve schermhoogte in CSS-pixels en de pixelverhouding; één keer per beeld bijgewerkt. */
export const pointView = {
  halfHeight: { value: 450 },
  dpr: { value: 1 },
};

const POINTS_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uSize;
uniform float uMaxPx;
uniform float uHalfHeight;
uniform float uDpr;
#ifdef VERTEX_COLORS
attribute vec3 color;
#endif
#ifdef PER_POINT_MAX
attribute float aMax;
#endif
varying vec3 vColor;
varying float vFade;
void main() {
  #ifdef VERTEX_COLORS
  vColor = color;
  #else
  vColor = vec3(1.0);
  #endif
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float px = uSize * uHalfHeight / max(-mv.z, 1e-9);
  #ifdef PER_POINT_MAX
  float top = aMax;
  #else
  float top = uMaxPx;
  #endif
  // Kleiner dan een pixel: niet krimpen maar dimmen, dan flikkert het niet.
  vFade = clamp(px / 1.2, 0.0, 1.0);
  gl_PointSize = clamp(px, 1.2, top) * uDpr;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;

const POINTS_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor;
uniform float uOpacity;
uniform float uCore;
varying vec3 vColor;
varying float vFade;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = mix(exp(-d * d * 4.0), 1.0 - smoothstep(0.35, 1.0, d), uCore);
  gl_FragColor = vec4(uColor * vColor * a * uOpacity * vFade, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Ronde, zachte punten met een bovengrens in pixels. Grootte groeit met nabijheid zoals
 * bij `sizeAttenuation`, maar een ster wordt nooit een vierkant van honderden pixels.
 */
export function softPointsMaterial(opts: {
  size: number;
  maxPx: number;
  opacity: number;
  color?: string;
  vertexColors?: boolean;
  perPointMax?: boolean;
  core?: number;
}) {
  const defines: Record<string, string> = {};
  if (opts.vertexColors) defines.VERTEX_COLORS = "";
  if (opts.perPointMax) defines.PER_POINT_MAX = "";
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: opts.size },
      uMaxPx: { value: opts.maxPx },
      uHalfHeight: pointView.halfHeight,
      uDpr: pointView.dpr,
      uColor: { value: new THREE.Color(opts.color ?? "#ffffff") },
      uOpacity: { value: opts.opacity },
      uCore: { value: opts.core ?? 0.5 },
    },
    defines,
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
