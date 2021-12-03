import { REGL, safeProp } from './regl';

export type LineConfig = {
    color:number[],
    primitive:string,
    alpha:number,
    count:number,
    position:number[],
  };

export type AxisHelper = {
    lines:LineConfig[],
};

export function createAxisHelper(x, y, z) : AxisHelper {
    const w = x;
    const h = y;
    const b = z;
  
    const lines:LineConfig[] = [];
  
    lines.push({
      color: [0.96, 0.26, 0.21],
      primitive: 'lines',
      alpha: 1,
      count: 8,
      position: [0, 0, 0, w , 0, 0, 0, 0.02, 0, w , 0.02, 0, 0, 0, 0.02, w , 0, 0.02, 0, 0.02, 0.02, w , 0.02, 0.02],
    });
    lines.push({
      color: [0.46, 0.87, 0],
      primitive: 'lines',
      alpha: 1,
      count: 8,
      position: [0, 0, 0, 0, h , 0, 0.02, 0, 0, 0.02, h , 0, 0, 0, 0.02, 0, h , 0.02, 0.02, 0, 0.02, 0.02, h , 0.02],
    });
    lines.push({
      color: [0.13, 0.59, 0.95],
      primitive: 'lines',
      alpha: 1,
      count: 8,
      position: [0, 0, 0, 0, 0, b, 0.02, 0, 0, 0.02, 0, b, 0, 0.02, 0, 0, 0.02, b, 0.02, 0.02, 0, 0.02, 0.02, b],
    });
    
    return {
      lines,
    };
}

export function glAxis(regl:REGL) {

    const lineProp = safeProp<LineConfig>(regl);

    return regl({
        blend: {
            enable: true,
            func: {
              srcRGB: 'src alpha',
              srcAlpha: 1,
              dstRGB: 'one minus src alpha',
              dstAlpha: 1,
            },
            equation: {
              rgb: 'add',
              alpha: 'add',
            },
            color: [0, 0, 0, 0],
          },
          frag: `
            precision mediump float;
            uniform vec3 color;
            uniform float alpha;
            void main() {
              gl_FragColor = vec4(color, alpha);
            }
            `,
            vert: `
            precision mediump float;
            attribute vec3 position;
            uniform mat4 projection, view;
            void main() {
              gl_Position = projection * view * vec4(position, 1);
              gl_PointSize = 3.0;
            }
            `,
            attributes: {
              position: lineProp('position').prop,
            },
            uniforms: {
              alpha: lineProp('alpha').prop,
              color: lineProp('color').prop,
            },
            lineWidth: 1,
            count: lineProp('count').prop,
            primitive: lineProp('primitive').prop,
    });
}