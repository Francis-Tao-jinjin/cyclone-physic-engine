import { REGL, REGLLoader, safeProp } from './regl';

export const SHADOW_RES = 1024;

export class ShadowRender {
    
    public fbo;
    public drawDepth;
    public drawShadow;

    constructor (private regl:REGL, loader:REGLLoader) {
        this.fbo = regl.framebuffer({
            color: regl.texture({
                width: SHADOW_RES,  
                height: SHADOW_RES,
                wrap: 'clamp',
                type: 'float',
            }),
            depth: true,
        });
        this.drawDepth = loader.require(this.glDepth);
        this.drawShadow = loader.require(this.glShadow);
    }

    private glDepth = () => {
        return this.regl({
            vert:`
            precision mediump float;
            attribute vec3 position;
            uniform mat4 lightProjection, lightView, model;
            varying vec3 vPosition;
            void main() {
                vec4 p = lightProjection * lightView * model * vec4(position, 1.0);
                gl_Position = p;
                vPosition = p.xyz;
            }
            `,
            frag: `
            precision mediump float;
            varying vec3 vPosition;
            void main() {
                gl_FragColor = vec4(vec3(vPosition.z), 1.0);
            }
            `,
            framebuffer: this.fbo,
        });
    }

    private glShadow = () => {
        return this.regl({
            vert: `
            precision mediump float;
            attribute vec3 position;
            attribute vec3 normal;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vShadowCoord;
    
            uniform mat3 normalMat;
            uniform mat4 projection, view, model;
            uniform mat4 lightProjection, lightView;
            
            void main() {
                vPosition = position;
                vNormal = normal;
                // vNormal = normalize(normalMat * normal);
    
                vec4 worldSpacePosition = model * vec4(position, 1.0);
                gl_Position = projection * view * worldSpacePosition;
                vShadowCoord = (lightProjection * lightView * worldSpacePosition).xyz;
            }
            `,
            frag: `
            precision mediump float;
    
            varying vec3 vNormal;
            varying vec3 vShadowCoord;
            uniform float ambientLightAmount;
            uniform float diffuseLightAmount;
            uniform vec3 color;
            uniform sampler2D shadowMap;
            uniform vec3 lightDir;
            uniform float minBias;
            uniform float maxBias;
    
            const float texelSize = 1.0 / float(${SHADOW_RES});
    
            float shadowSample(vec2 co, float z, float bias) {
                float a = texture2D(shadowMap, co).z;
                float b = vShadowCoord.z;
                return step(b-bias, a);
            }
    
            void main() {
                vec3 ambient = ambientLightAmount * color;
                float cosTheta = dot(vNormal, lightDir);
                vec3 diffuse = diffuseLightAmount * color * clamp(cosTheta, 0.0, 1.0);
    
                float v = 1.0; // shadow value
                vec2 co = vShadowCoord.xy * 0.5 + 0.5; // go from range [-1,+1] to range [0,+1]
    
                // counteract shadow acne
                float bias = max(maxBias * (1.0 - cosTheta), minBias);

                float v0 = shadowSample(co + texelSize * vec2(0.0, 0.0), vShadowCoord.z, bias);
                float v1 = shadowSample(co + texelSize * vec2(1.0, 0.0), vShadowCoord.z, bias);
                float v2 = shadowSample(co + texelSize * vec2(0.0, 1.0), vShadowCoord.z, bias);
                float v3 = shadowSample(co + texelSize * vec2(1.0, 1.0), vShadowCoord.z, bias);
    
                // PCF filtering
                v = (v0 + v1 + v2 + v3) * (1.0 / 4.0);
    
                // if outside light frustum, render now shadow.
                // If WebGL had GL_CLAMP_TO_BORDER we would not have to do this,
                // but that is unfortunately not the case...
                if(co.x < 0.0 || co.x > 1.0 || co.y < 0.0 || co.y > 1.0) {
                    v = 1.0;
                }
                gl_FragColor = vec4((ambient + diffuse * v), 1.0);
            }
            `,
            uniforms: {
                shadowMap: this.fbo,
                minBias: 0.005,
                maxBias: 0.03,
            },
        });
    }

    public depthPass(childCmd) {
        this.drawDepth(childCmd);
    }

    public shadowPass(childCmd) {
        this.drawShadow(childCmd);
    }
}