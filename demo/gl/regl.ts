import _REGL from 'regl';

export type REGL = _REGL.Regl;

function _moduleLoader<ModType> (_:(regl:_REGL.Regl, requireREGL:REGLLoader, context2D:CanvasRenderingContext2D) => ModType) : ModType {
    return <ModType><any>void 0;
}

export interface REGLProfileData {
    count:number;
    cpuTime:number;
    gpuTime:number;
}

export interface REGLLoader {
    regl:_REGL.Regl;
    require:typeof _moduleLoader;
    cache:<StateType, PropType>(
        name:string,
        commandSpec:_REGL.DrawConfig,
        profile:boolean,
        flags?:{ [symbol:string]:(state:StateType) => boolean|number}) => (state:StateType) => (prop?:PropType, ...rest) => void;
    stats:() => { [name:string]:REGLProfileData };
    floatBuffer:{
        type:'uint8'|'half float'|'float';
        filter:'nearest'|'linear';
    };
    preloadShaders:<PropType>(state:PropType) => void;
}

export class CachedREGLCommand {
    constructor (
        public flagFunc:((state:any) => number|boolean)[],
        public flags:number[],
        public cmd:any) {}

    public test (state:any) {
        const { flags, flagFunc } = this;
        for (let i = 0; i < flags.length; ++i) {
            if (flags[i] !== +flagFunc[i](state)) {
                return false;
            }
        }
        return true;
    }
}

export function createREGLCache(regl, profile:boolean, context2D:CanvasRenderingContext2D) : REGLLoader {
    const definitionCache:any[] = [];
    const valueCache:any[] = [];

    const commandCache:{ [id:string]:CachedREGLCommand[] } = {};
    const commandDefinitionSet:((state) => any)[] = [];

    let type = 'half float';
    let filter = 'linear';
    if (regl.hasExtension('OES_texture_half_float')) {
        if (!regl.hasExtension('OES_texture_half_float_linear')) {
            filter = 'nearest';
        }
    } else if (regl.hasExtension('OES_texture_float')) {
        type = 'float';
        if (!regl.hasExtension('OES_texture_float_linear')) {
            filter = 'nearest';
        }
    } else {
        type = 'uint8';
    }

    // check that framebuffer configuration is renderable
    // on some phones they say half float is supported, but they really aren't
    if (type !== 'uint8') {
        const gl:WebGLRenderingContext = regl._gl;
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        const color = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, color);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, (type === 'float' ? gl.FLOAT : 0x8D61), null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
        if (gl.getError() || gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            type = 'uint8';
            filter = 'linear';
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(color);
        regl._refresh();
    }

    function preloadShaders (state) {
        for (let i = 0; i < commandDefinitionSet.length; ++i) {
            (commandDefinitionSet[i])(state);
        }
    }

    const loader:REGLLoader = {
        regl,
        cache:cacheCommand,
        require:requireModule,
        stats:() => {
            const result:{ [id:string]:REGLProfileData } = {};
            Object.keys(commandCache).map((key) => {
                const commands = commandCache[key];
                const x = {
                    count: 0,
                    cpuTime: 0,
                    gpuTime: 0,
                };
                for (let i = 0; i < commands.length; ++i) {
                    x.count += commands[i].cmd.stats.count;
                    x.cpuTime += commands[i].cmd.stats.cpuTime;
                    x.gpuTime += commands[i].cmd.stats.gpuTime;
                }
                result[key] = x;
            });
            return result;
        },
        floatBuffer: {
            type: <any>type,
            filter: <any>filter,
        },
        preloadShaders,
    };

    function cacheCommand (
        name:string,
        commandSpec:any,
        noProfile:boolean,
        flags?:{ [symbol:string]:(state) => boolean|number }) {
        const commandList:CachedREGLCommand[] = [];

        let baseFrag = commandSpec.frag;
        const baseVert = commandSpec.vert;

        if (baseFrag && regl.hasExtension('OES_standard_derivatives')) {
            baseFrag = '#extension GL_OES_standard_derivatives : enable\n' + baseFrag;
        }
        if (baseFrag && regl.hasExtension('EXT_shader_texture_lod')) {
            baseFrag = '#extension GL_EXT_shader_texture_lod : enable\n' + baseFrag;
        }

        if (!flags) {
            const spec = Object.assign({...commandSpec, profile: profile && !noProfile});
            if (baseFrag) {
                spec.frag = baseFrag;
            }
            if (baseVert) {
                spec.vert = baseVert;
            }
            const cmd = regl(spec);
            commandList.push(new CachedREGLCommand([], [], cmd));
            return cmd;
        }

        commandCache[name] = commandList;

        const flagSymbol = Object.keys(flags);
        const flagFunc = flagSymbol.map((sym) => flags[sym]);

        function generatePrefix (flagVals:number[]) {
            const result:string[] = [];
            for (let i = 0; i < flagSymbol.length; ++i) {
                if (flagVals[i]) {
                    result.push(`#define ${flagSymbol[i]} ${flagVals[i].toFixed(1)}`);
                }
            }
            return result.join('\n') + '\n';
        }

        function generateCommand (state) {
            const flagVals = flagFunc.map((f) => +f(state));
            const cmd = regl({
                ...commandSpec,
                frag: generatePrefix(flagVals) + baseFrag,
                vert: generatePrefix(flagVals) + baseVert,
                profile,
            });
            commandList.unshift(new CachedREGLCommand(flagFunc, flagVals, cmd));
            return cmd;
        }

        function getCommand (state) {
            for (let i = 0; i < commandList.length; ++i) {
                const cmd = commandList[i];
                if (cmd.test(state)) {
                    if (i > 0) {  // move to front of list
                        for (let j = i; j > 0; --j) {
                            commandList[j] = commandList[j - 1];
                        }
                        commandList[0] = cmd;
                    }
                    return cmd.cmd;
                }
            }
            return generateCommand(state);
        }

        commandDefinitionSet.push(getCommand);

        return getCommand;
    }

    function requireModule<ModuleType> (
        moduleDefinition:(regl:_REGL.Regl, requireRegl:REGLLoader, context2D:CanvasRenderingContext2D) => ModuleType) : ModuleType {
        const idx = definitionCache.indexOf(moduleDefinition);
        if (idx >= 0) {
            return valueCache[idx];
        }
        const moduleValue = moduleDefinition(regl, loader, context2D);
        definitionCache.push(moduleDefinition);
        valueCache.push(moduleValue);
        return moduleValue;
    }

    return loader;
}

export function safeProp<PropType> (regl:_REGL.Regl) {
    function next<U, P> (ret:(string|number|symbol)[], prop:P) {
        function m<K extends keyof U> (key:K) {
            const r = ret.slice();
            r.push(key);
            const p = regl.prop<U, typeof key>(<any>r.join('.'));
            return next<U[K], typeof p>(r, p);
        }
        return Object.assign(m, {
            prop,
        });
    }
    const _prop = regl.prop<{ p:PropType }, 'p'>(<any>'');
    return next<PropType, typeof _prop>([], <typeof _prop><any>((_, x) => x));
}
