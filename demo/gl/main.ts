import { REGL, REGLLoader, safeProp } from './regl';
import glPlane from './plane';
import { Camera } from '../component/camera';
// import { getApplication } from '../ballistic/index';
import { getApplication } from '../firework/index';
import { getTimingData } from '../component/timing';
import { mat4, vec3 } from 'gl-matrix';
import { ShadowRender } from './shadow';
import { createAxisHelper, glAxis } from './axis';

type RenderProps = {
    camera:Camera,
    lightDir:vec3|number[],
};

const worldSize = 250;

export = function(regl:REGL, loader:REGLLoader) {

    const drawPlane = loader.require(glPlane);
    const drawAxis = loader.require(glAxis);
    const shadowRender = new ShadowRender(regl, loader);
    const renderProps = safeProp<RenderProps>(regl);

    const lightView = mat4.create();
    const axis = createAxisHelper(worldSize/2, worldSize/2, worldSize/2);

    const setup = regl({
        context: {
            eye: renderProps('camera')('eye').prop,
            view: renderProps('camera')('view').prop,
            projection: renderProps('camera')('projection').prop,
            invView: renderProps('camera')('invView').prop,
            invProjection: renderProps('camera')('invProjection').prop,
            lightDir: renderProps('lightDir').prop,
        },
        uniforms: {
            eye: renderProps('camera')('eye').prop,
            view: renderProps('camera')('view').prop,
            projection: renderProps('camera')('projection').prop,
            invView: renderProps('camera')('invView').prop,
            invProjection: renderProps('camera')('invProjection').prop,

            lightDir: renderProps('lightDir').prop,
            lightView: (ctx) => {
                return mat4.lookAt(lightView, ctx.lightDir as vec3, [0,0,0], [0,1,0]);
            },
            lightProjection: mat4.ortho(mat4.create(), -200, 200, -200, 200, -200, 200),
        }
    });

    const app = getApplication(regl);
    const timing = getTimingData();

    return function(props) {
        
        timing.update();
        app.update();

        setup(props, ({tick}) => {
            const drawDepthPass = () => {
                regl.clear({
                    // color: [0.361, 0.392, 0.424, 1],
                    color: [0.001, 0.001, 0.001, 1],
                    depth: 1,
                });
                drawPlane({scale: worldSize, translate: [0.0, 0.0, 0.0], color: [.8, .8, .8]});
                app.drawDepthPass();11111
            }

            const drawShadowPass = () => {
                regl.clear({
                    color: [0.001, 0.001, 0.001, 1],
                    depth: 1,
                });
                drawPlane({scale: worldSize, translate: [0.0, 0.0, 0.0], color: [.8, .8, .8]});
                app.drawShadowPass();
            }


            shadowRender.drawDepth(drawDepthPass);
            shadowRender.drawShadow(drawShadowPass);

            drawAxis(axis.lines);
        });
    }
}