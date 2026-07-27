/**
 * GLSL used by the hero scene.
 *
 * The background is a single full-screen triangle-strip plane running a
 * domain-warped fBm field. Warping the noise input by another noise field is
 * what produces the slow liquid folds — cheaper and more organic than stacking
 * many octaves.
 */

export const fullscreenVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const NOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  // Simplex noise — Ashima / Gustavson, 2D variant.
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * snoise(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return value;
  }
`;

export const auroraFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uPointer;      // 0..1, smoothed
  uniform float uPointerForce; // 0..1, decays after movement
  uniform vec3  uAccent;
  uniform vec3  uHighlight;
  uniform float uIntensity;
  uniform float uScrollProgress;
  uniform int   uOctaves;

  ${NOISE}

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    float t = uTime * 0.055;

    // Domain warp: displace the sample point with a slower noise field.
    vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t), uOctaves),
                  fbm(p * 1.4 + vec2(3.7, -t * 0.8), uOctaves));

    vec2 r = vec2(fbm(p * 2.1 + q * 1.9 + vec2(1.7, 9.2) + t * 0.6, uOctaves),
                  fbm(p * 2.1 + q * 1.9 + vec2(8.3, 2.8) - t * 0.4, uOctaves));

    float field = fbm(p * 1.6 + r * 1.4, uOctaves);
    field = field * 0.5 + 0.5;

    // Pointer acts as a light source pushing energy into the field.
    vec2 pointer = vec2((uPointer.x - 0.5) * aspect, (uPointer.y - 0.5));
    float pointerDist = length(p - pointer);
    float pointerGlow = exp(-pointerDist * 3.4) * uPointerForce;

    // Ribbon bands: sharpened contours through the warped field.
    float bands = smoothstep(0.34, 0.72, field + pointerGlow * 0.35);
    float ribbons = abs(sin(field * 7.0 + t * 2.2 + length(r) * 1.5));
    ribbons = pow(1.0 - ribbons, 5.0) * 0.55;

    vec3 base = vec3(0.016, 0.016, 0.022);
    vec3 colour = base;

    colour += uAccent * bands * 0.42 * uIntensity;
    colour += uHighlight * ribbons * 0.5 * uIntensity;
    colour += mix(uAccent, uHighlight, clamp(q.x * 0.5 + 0.5, 0.0, 1.0)) * pointerGlow * 0.85;

    // Depth: the composition darkens as the visitor scrolls away from the hero.
    colour *= 1.0 - uScrollProgress * 0.55;

    // Vignette + subtle horizon lift.
    float vignette = smoothstep(1.15, 0.28, length(p * vec2(0.86, 1.12)));
    colour *= mix(0.42, 1.0, vignette);
    colour += uAccent * 0.03 * smoothstep(0.0, 0.55, uv.y);

    // Dithering kills banding in the dark gradients.
    float dither = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    colour += (dither - 0.5) * 0.006;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

export const shapeVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  uniform float uTime;
  uniform float uAmplitude;

  ${NOISE}

  void main() {
    vNormal = normalize(normalMatrix * normal);

    float noise = fbm(position.xy * 1.1 + uTime * 0.12, 3) * 0.5
                + fbm(position.yz * 1.4 - uTime * 0.08, 3) * 0.5;

    vDisplacement = noise;
    vec3 displaced = position + normal * noise * uAmplitude;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const shapeFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  uniform vec3  uAccent;
  uniform vec3  uHighlight;
  uniform float uOpacity;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim — the object reads as glass catching a light behind it.
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 2.6);
    float shade = clamp(vDisplacement * 0.5 + 0.5, 0.0, 1.0);

    vec3 colour = mix(uAccent, uHighlight, shade);
    colour *= 0.28 + fresnel * 1.6;

    gl_FragColor = vec4(colour, (fresnel * 0.9 + 0.08) * uOpacity);
  }
`;
