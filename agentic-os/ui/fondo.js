// Fondo vivo (three.js): partículas que fluyen despacio y reaccionan al ratón. Se pausa si la pestaña no se ve.
import * as THREE from 'three';

const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function fondo() {
  const lienzo = document.createElement('canvas');
  lienzo.className = 'fondo-vivo'; lienzo.setAttribute('aria-hidden', 'true');
  document.body.prepend(lienzo);
  const r = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: false, powerPreference: 'low-power' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const escena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 1, 2000); cam.position.z = 600;
  const N = innerWidth < 700 ? 900 : 2200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sem = new Float32Array(N);
  const tonos = ['#cbf589', '#bdb2ff', '#8cf2cc', '#78d7ff', '#ffca87'].map(c => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    pos.set([(Math.random() - .5) * 1800, (Math.random() - .5) * 1100, (Math.random() - .5) * 900], i * 3);
    const c = tonos[i % tonos.length].clone().multiplyScalar(.35 + Math.random() * .5); col.set([c.r, c.g, c.b], i * 3); sem[i] = Math.random() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('semilla', new THREE.BufferAttribute(sem, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, raton: { value: new THREE.Vector2() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: `uniform float t; uniform vec2 raton; attribute float semilla; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; float s=semilla;
        p.x+=sin(t*.00011*(1.0+mod(s,3.0))+p.y*.004)*38.0; p.y+=cos(t*.00009*(1.0+mod(s,5.0))+p.x*.003)*30.0; p.z+=sin(t*.00007+s)*40.0;
        p.xy+=raton*(p.z+500.0)*.05;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(1.6+mod(s,2.4))*(600.0/-mv.z); gl_Position=projectionMatrix*mv;
        vC=color; vA=.55+.45*sin(t*.0012+s); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC*vA*(1.0-d*2.0),1.0); }`,
  });
  escena.add(new THREE.Points(g, mat));
  const raton = new THREE.Vector2(), objetivo = new THREE.Vector2();
  addEventListener('pointermove', e => objetivo.set(e.clientX / innerWidth - .5, -(e.clientY / innerHeight - .5)), { passive: true });
  function medir() { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix() }
  addEventListener('resize', medir); medir();
  function bucle(t) {
    requestAnimationFrame(bucle); if (document.hidden) return;
    raton.lerp(objetivo, .04); mat.uniforms.t.value = QUIETO ? 0 : t; mat.uniforms.raton.value.copy(raton);
    escena.rotation.y = QUIETO ? 0 : Math.sin(t * .00005) * .08; r.render(escena, cam);
  }
  requestAnimationFrame(bucle);
}
