import { Particle } from '../../src/particle';
import { vec3, mat3 } from '../../src/vector';
import icosphere from 'icosphere';
import normals from 'normals';
import { mat4 } from 'gl-matrix';
import { getTimingData } from '../component/timing';
import { drawMesh } from './gl';
import { REGL } from '../gl/regl';
import { calculateNormalMat } from '../utils/calculateNormalMat';

enum ShotType {
    UNUSED = 0,
    PISTOL,
    ARTILLERY,
    FIREBALL,
    LASER,
}

export interface AmmoEntityInterface {
    mesh:{
        vertices: number[][],
        faces: number[][],
        faceNormals: number[][],
    };
    color:vec3;
    model:mat4;
    normalMat:mat3;
}

const Meshes = new Map();

export class AmmoRound implements AmmoEntityInterface {

    public ammoType:ShotType = ShotType.UNUSED;
    public particle:Particle;
    public startTime;
    public mesh:{
        vertices: number[][],
        faces: number[][],
        faceNormals: number[][],
    };
    public color = vec3.create();
    public model = mat4.create();
    public normalMat = mat3.create();
    public scale = vec3.fromValues(1,1,1);

    constructor() {
        this.particle = new Particle();
        if (!Meshes.has('icosphere_3')) {
            Meshes.set('icosphere_3', icosphere(3));
        }
        const mesh = Meshes.get('icosphere_3');
        this.mesh = {
            vertices: mesh.positions,
            faces: mesh.cells,
            faceNormals: normals.vertexNormals(mesh.cells, mesh.positions),
        };
        vec3.set(this.color, 0.85, 0.2, 0.2);
    }

    public prepare() {
        mat4.identity(this.model);
        const position = this.particle.getPosition();
        mat4.scale(this.model, this.model, this.scale);
        mat4.translate(this.model, this.model, position);
        console.log(position);
        calculateNormalMat(this.normalMat, this.model);
    }
}

class BallisticDemo {
    public static ammoRounds = 16;
    public ammo:AmmoRound[] = [];
    public currentShotType:ShotType = ShotType.ARTILLERY;

    private drawMesh;

    constructor(private regl) {
        this.drawMesh = drawMesh(regl);
        this.onKeyDown = this.onKeyDown.bind(this);
        window.document.body.addEventListener('keydown', this.onKeyDown);   
    }

    public getTitel() {
        return 'Cyclone > Ballistic Demo';
    }

    public fire() {
        let i = 0;
        for (; i < BallisticDemo.ammoRounds; i++) {
            if (typeof this.ammo[i] === 'undefined' ||
                this.ammo[i].ammoType === ShotType.UNUSED) {
                break;
            }
        }
        if (i >= BallisticDemo.ammoRounds) {
            return;
        }
        this.ammo[i] = new AmmoRound();
        switch(this.currentShotType) {
            case ShotType.PISTOL:
                this.ammo[i].particle.setMass(2);   // 2.0kg
                this.ammo[i].particle.setVelocity(0, 0, 35);    // 35m/s
                this.ammo[i].particle.setAcceleration(0, -1, 0);
                this.ammo[i].particle.setDamping(0.99);
                break;
            case ShotType.ARTILLERY:
                this.ammo[i].particle.setMass(200); // 200.0kg
                this.ammo[i].particle.setVelocity(0, 30, 40);   // 50m/s
                this.ammo[i].particle.setAcceleration(0, -20, 0);
                this.ammo[i].particle.setDamping(0.99);
                break;
            case ShotType.FIREBALL:
                this.ammo[i].particle.setMass(1);   // 1.0kg - mostly blast damage
                this.ammo[i].particle.setVelocity(0, 0, 10);    // 5m/s
                this.ammo[i].particle.setAcceleration(0, 0.6, 0);   // Floats up
                this.ammo[i].particle.setDamping(0.9);
                break;
            case ShotType.LASER:
                // Note that this is the kind of laser bolt seen in films,
                // not a realistic laser beam!
                this.ammo[i].particle.setMass(0.1);     // 0.1kg - almost no weight
                this.ammo[i].particle.setVelocity(0, 0, 100);   // 100m/s
                this.ammo[i].particle.setAcceleration(0, 0, 0); // No gravity
                this.ammo[i].particle.setDamping(0.9);
                break;
        }

        // Set the data common to all particle types
        this.ammo[i].particle.setPosition(0, 1.5, 0);
        this.ammo[i].startTime = Date.now();
        this.ammo[i].ammoType = this.currentShotType;

        this.ammo[i].particle.clearAccumulator();
    }

    public update() {
        // Find the duration of the last frame in seconds
        let duration = getTimingData().lastFrameDuration * 0.001;
        // duration *= 0.5;
        if (duration <= 0) {
            return;
        }
        for (let i = 0; i < this.ammo.length; i++) {
            const curAmmo = this.ammo[i];
            if (curAmmo && curAmmo.ammoType !== ShotType.UNUSED) {
                curAmmo.particle.integrate(duration);
                curAmmo.prepare();

                if (curAmmo.particle.getPosition()[1] < 0.0 ||
                    curAmmo.startTime + 5000 < getTimingData().lastFrameTimestamp ||
                    curAmmo.particle.getPosition()[2] > 200) {
                    curAmmo.ammoType = ShotType.UNUSED;
                }
            }
        }
    }

    public drawDepthPass() {
        for (let i = 0; i < this.ammo.length; i++) {
            this.drawMesh(this.ammo[i]);
        }
    }

    public drawShadowPass() {
        for (let i = 0; i < this.ammo.length; i++) {
            this.drawMesh(this.ammo[i]);
        }
    }

    public onKeyDown = (ev:KeyboardEvent) => {
        switch (ev.code) {
            case 'Space':
                this.fire();
                break;
            case 'Digit1':
                this.currentShotType = ShotType.PISTOL;
                break;
            case 'Digit2':
                this.currentShotType = ShotType.ARTILLERY;
                break;
            case 'Digit3':
                this.currentShotType = ShotType.FIREBALL;
                break;
            case 'Digit4':
                this.currentShotType = ShotType.LASER;
                break;
        }
    }
}

export function getApplication(regl:REGL) {
    return new BallisticDemo(regl);
}