import * as THREE from "three";

export type V3 = [number, number, number];

const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vc = new THREE.Vector3();

/** Collects quads, boxes and parametric surfaces into one geometry, so each material draws in one call. */
export class MeshBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private idx: number[] = [];
  private n = 0;

  private vert(p: V3, normal: V3, u: number, v: number, c: THREE.Color) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(normal[0], normal[1], normal[2]);
    this.uv.push(u, v);
    this.col.push(c.r, c.g, c.b);
  }

  /** a b c d counter-clockwise as seen from the side the normal points to */
  quad(a: V3, b: V3, c: V3, d: V3, color: THREE.Color, uw = 1, vh = 1) {
    va.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    vb.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    vc.crossVectors(va, vb).normalize();
    const normal: V3 = [vc.x, vc.y, vc.z];
    this.vert(a, normal, 0, 0, color);
    this.vert(b, normal, uw, 0, color);
    this.vert(c, normal, uw, vh, color);
    this.vert(d, normal, 0, vh, color);
    const n = this.n;
    this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
  }

  /** Box sides; `module` sets texture repeats per metre as [across, up] */
  walls(x: number, z: number, w: number, d: number, y0: number, h: number, color: THREE.Color, module: [number, number] = [1, 1]) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h;
    const [mu, mv] = module;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, w * mu, h * mv);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color, w * mu, h * mv);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color, d * mu, h * mv);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color, d * mu, h * mv);
  }

  /** A closed box: four sides and a top */
  box(x: number, z: number, w: number, d: number, y0: number, h: number, color: THREE.Color) {
    this.walls(x, z, w, d, y0, h, color);
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y = y0 + h;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], color);
  }

  /** A box whose long axis runs from (x1, z1) to (x2, z2): walls, beams, fins */
  bar(x1: number, z1: number, x2: number, z2: number, width: number, y0: number, h: number, color: THREE.Color) {
    const len = Math.hypot(x2 - x1, z2 - z1) || 1;
    const nx = (-(z2 - z1) / len) * (width / 2), nz = ((x2 - x1) / len) * (width / 2);
    const p = (x: number, z: number, y: number): V3 => [x, y, z];
    const a0 = p(x1 + nx, z1 + nz, y0), b0 = p(x2 + nx, z2 + nz, y0), c0 = p(x2 - nx, z2 - nz, y0), d0 = p(x1 - nx, z1 - nz, y0);
    const y1 = y0 + h;
    const a1 = p(a0[0], a0[2], y1), b1 = p(b0[0], b0[2], y1), c1 = p(c0[0], c0[2], y1), d1 = p(d0[0], d0[2], y1);
    this.quad(a0, b0, b1, a1, color);
    this.quad(c0, d0, d1, c1, color);
    this.quad(d0, a0, a1, d1, color);
    this.quad(b0, c0, c1, b1, color);
    this.quad(a1, b1, c1, d1, color);
  }

  /**
   * A parametric surface over u, v in [0, 1]. Normals come from the surface derivatives and are
   * flipped, with the winding, wherever they face away from `outward(p)`.
   */
  surface(
    nu: number, nv: number,
    f: (u: number, v: number) => V3,
    color: THREE.Color | ((u: number, v: number) => THREE.Color),
    outward: (p: V3) => V3,
    uvScale: [number, number] = [1, 1]
  ) {
    const e = 1e-3;
    const start = this.n;
    let flip = false;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = j / nv;
        const p = f(u, v);
        const pu1 = f(Math.min(1, u + e), v), pu0 = f(Math.max(0, u - e), v);
        const pv1 = f(u, Math.min(1, v + e)), pv0 = f(u, Math.max(0, v - e));
        va.set(pu1[0] - pu0[0], pu1[1] - pu0[1], pu1[2] - pu0[2]);
        vb.set(pv1[0] - pv0[0], pv1[1] - pv0[1], pv1[2] - pv0[2]);
        vc.crossVectors(va, vb);
        if (vc.lengthSq() < 1e-12) vc.set(0, 1, 0);
        vc.normalize();
        const o = outward(p);
        if (i === Math.floor(nu / 2) && j === Math.floor(nv / 2)) flip = vc.x * o[0] + vc.y * o[1] + vc.z * o[2] < 0;
        this.vert(p, [vc.x, vc.y, vc.z], u * uvScale[0], v * uvScale[1], typeof color === "function" ? color(u, v) : color);
      }
    }
    if (flip) {
      for (let k = start * 3; k < this.nor.length; k++) this.nor[k] = -this.nor[k];
    }
    const row = nu + 1;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = start + j * row + i, b = a + 1, c = a + row + 1, d = a + row;
        if (flip) this.idx.push(a, c, b, a, d, c);
        else this.idx.push(a, b, c, a, c, d);
      }
    }
    this.n += row * (nv + 1);
  }

  get empty() {
    return this.n === 0;
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
