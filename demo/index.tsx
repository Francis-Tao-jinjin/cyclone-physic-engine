import * as React from 'react';
import * as ReactDom from 'react-dom';
import createREGL = require('regl');
import { createREGLCache } from './gl/regl';
import { Camera } from './component/camera';
import glMain = require('./gl/main');

async function start() {
    const regl = createREGL({
        extensions: [
            'OES_element_index_uint',
            'OES_texture_float',
        ],
        attributes: {
            alpha: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        }
    });

    const canvas = regl._gl.canvas;
    const camera = new Camera((canvas as HTMLCanvasElement));
    const reglLoader = createREGLCache(regl, false, (regl._gl.canvas.getContext('2d') as CanvasRenderingContext2D));
    const renderFrame = reglLoader.require(glMain);
    camera.target[0] = 0;
    camera.target[2] = 0;

    const reactContainer = document.createElement('div');
    reactContainer.id = 'react-container';
    const containerStyle = reactContainer.style;
    containerStyle.width = '100%';
    containerStyle.height = '100%';
    containerStyle.position = 'absolute';
    containerStyle.left = '0';
    containerStyle.top = '0';
    containerStyle.margin = '0';
    containerStyle.padding = '0';
    document.body.appendChild(reactContainer);

    regl.frame(() => {
        camera.updateCamera();
        renderFrame({
            camera: camera,
            // lightDir: [0.39, 0.87, 0.29],
            lightDir: [0.001, 0.999, 0.001],
        });
    });
}

start().catch((err) => console.error(err));