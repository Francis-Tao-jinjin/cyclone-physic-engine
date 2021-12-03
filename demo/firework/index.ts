import { Particle } from "../../src/particle";
import { vec3 } from 'gl-matrix';
import { randomReal, randomVector } from "../utils/random";
import { getTimingData } from "../component/timing";
import { glDepth, glParticle } from './gl';
import { REGL } from '../gl/regl';
/**
 * Fireworks are particles, with additional data for rendering and
 * evolution.
 */
export class Firework extends Particle {
    /** Fireworks have an integer type, used for firework rules. */ 
    public type = 0;
    public age:number = 0;
    public color = vec3.create();

    constructor() {
        super();
    }

    public update(duration:number) : boolean {
        this.integrate(duration);
        this.age -= duration;

        return (this.age < 0) || (this.position[1] < 0);
    }
}

/**
 * The payload is the new firework type to create when this
 * firework's fuse is over.
 */
class Payload {
    /** The type of the new particle to create. */
    public type = 0;
    /** The number of particles in this payload. */
    public count = 0;

    /** Sets the payload properties in one go. */
    public set(type:number, count:number) {
        this.type = type;
        this.count = count;
    }
}

/**
 * Firework rules control the length of a firework's fuse and the
 * particles it should evolve into.
 */
class FireworkRule {

    public type = 0;
    public minAge = 0;
    public maxAge = 0;
    public minVelocity = vec3.create();
    public maxVelocity = vec3.create();
    public damping:number = 0;

    public payloadCount;
    public payloads!:Payload[];

    constructor() {
        this.payloadCount = 0;
    }

    public init(payloadCount:number) {
        this.payloadCount = payloadCount;
        this.payloads = [];
        for (let i = 0; i < this.payloadCount; i++) {
            this.payloads[i] = new Payload();
        }
    }

    /**
     * Set all the rule parameters in one go.
     */
    public setParameters(type:number, minAge:number, maxAge:number,
                        minVelocity:vec3|number[], maxVelocity:vec3|number[], damping:number) {
        this.type = type;
        this.minAge = minAge;
        this.maxAge = maxAge;
        vec3.copy(this.minVelocity, minVelocity as vec3);
        vec3.copy(this.maxVelocity, maxVelocity as vec3);
        this.damping = damping;
    }

    /**
     * Creates a new firework of this type and writes it into the given
     * instance. The optional parent firework is used to base position
     * and velocity on.
     */
    public create(firework:Firework, parent:Firework|null = null) {
        firework.type = this.type;
        firework.age = randomReal(this.minAge, this.maxAge);
        
        let vel = vec3.create();
        if (parent) {
            firework.setPosition(parent.getPosition());
            vec3.add(vel, vel, parent.getVelocity());
        } else {
            const start = vec3.create();;
            let x = Math.round(Math.random() * 3 - 1);
            start[0] = 5 * x;
            firework.setPosition(start);
        }

        vec3.add(vel, vel, randomVector(this.minVelocity, this.maxVelocity));
        firework.setVelocity(vel);
        // We use a mass of one in all cases (no point having fireworks
        // with different masses, since they are only under the influence
        // of gravity).
        firework.setMass(1);
        firework.setDamping(this.damping);
        firework.setAcceleration([0, -9.81, 0]);
        firework.clearAccumulator();
    }
}


class FireworksDemo {

    public static maxFireworks = 1024;
    public static ruleCount = 9;

    /** Holds the firework data. */
    public fireworks:Firework[] = [];

    /** Holds the index of the next firework slot to use. */
    public nextFirework:number = 0;

    /** Holds the set of rules. */
    public rules:FireworkRule[] = [];

    public FireworksData = {
        position: ([] as vec3[]),
        color: ([] as vec3[]),
        count: 0,
    };

    private drawDepth;
    private drawParticle;

    constructor(private regl) {
        this.drawDepth = glDepth(regl);
        this.drawParticle = glParticle(regl);
        window.document.body.addEventListener('keydown', this.onKeyDown);

        this.initFireworkRules();
    }

    public initFireworkRules() {
        const rules = this.rules;
        for (let i = 0; i < FireworksDemo.ruleCount; i++) {
            rules[i] = new FireworkRule();
        }
        rules[0].init(2);
        rules[0].setParameters(
                1, // type
                // 0.5, 1.4, // age range
                1, 2.8, // age range
                [-5, 25, -5].map((i) => i * 10), // min velocity
                [5, 28, 5].map((i) => i * 10), // max velocity
                0.1 // damping
            );
        rules[0].payloads[0].set(3, 5);
        rules[0].payloads[1].set(5, 5);

        rules[1].init(1);
        rules[1].setParameters(
            2, // type
            0.5, 1.0, // age range
            [-5, 10, -5].map((i) => i * 2), // min velocity
            [5, 20, 5].map((i) => i * 2), // max velocity
            0.8 // damping
            );
        rules[1].payloads[0].set(4, 2);
    
        rules[2].init(0);
        rules[2].setParameters(
            3, // type
            // 0.5, 1.5, // age range
            1, 2, // age range
            [-15, -5, -15].map((i) => i * 5), // min velocity
            [15, 5, 15].map((i) => i * 5), // max velocity
            0.1 // damping
            );
    
        rules[3].init(0);
        rules[3].setParameters(
            4, // type
            0.25, 0.5, // age range
            [-20, 5, -5].map((i) => i * 2), // min velocity
            [20, 5, 5].map((i) => i * 2), // max velocity
            0.2 // damping
            );
    
        rules[4].init(1);
        rules[4].setParameters(
            5, // type
            0.5, 1.0, // age range
            [-20, 2, -5].map((i) => i * 4), // min velocity
            [20, 18, 5].map((i) => i * 4), // max velocity
            0.01 // damping
            );
        rules[4].payloads[0].set(9, 5);
    
        rules[5].init(0);
        rules[5].setParameters(
            6, // type
            3, 5, // age range
            [-5, 5, -5].map((i) => i * 2), // min velocity
            [5, 10, 5].map((i) => i * 2), // max velocity
            0.95 // damping
            );
    
        rules[6].init(1);
        rules[6].setParameters(
            7, // type
            4, 5, // age range
            [-5, 50, -5].map((i) => i * 2), // min velocity
            [5, 60, 5].map((i) => i * 2), // max velocity
            0.01 // damping
            );
        rules[6].payloads[0].set(8, 10);
    
        rules[7].init(0);
        rules[7].setParameters(
            8, // type
            0.25, 0.5, // age range
            [-1, -1, -1].map((i) => i * 2), // min velocity
            [1, 1, 1].map((i) => i * 2), // max velocity
            0.01 // damping
            );
    
        rules[8].init(0);
        rules[8].setParameters(
            9, // type
            7, 10, // age range
            [-15, 10, -15].map((i) => i * 2), // min velocity
            [15, 15, 15].map((i) => i * 2), // max velocity
            0.95 // damping
            );
    }

    public create(type:number, parent:Firework|null) {
        const rule = this.rules[type - 1];
        if (typeof this.fireworks[this.nextFirework] === 'undefined' || this.fireworks[this.nextFirework] === null) {
            this.fireworks[this.nextFirework] = new Firework();
            switch (type) {
                case 1:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 0, 0);
                    break;
                case 2:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 0.5, 0);
                    break;
                case 3:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 1, 0);
                    break;
                case 4:
                    vec3.set(this.fireworks[this.nextFirework].color, 0, 1, 0);
                    break;
                case 5:
                    vec3.set(this.fireworks[this.nextFirework].color, 0, 1, 1);
                    break;
                case 6:
                    vec3.set(this.fireworks[this.nextFirework].color, 0.4, 0.4, 1);
                    break;
                case 7:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 0, 1);
                    break;
                case 8:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 1, 1);
                    break;
                case 9:
                    vec3.set(this.fireworks[this.nextFirework].color, 1, 0.5, 0.5);
                    break;
            }

        }
        // Create the firework
        rule.create(this.fireworks[this.nextFirework], parent);

        // Increment the index for the next firework
        this.nextFirework = (this.nextFirework + 1) % FireworksDemo.maxFireworks;
    }

    public batchCreate(type:number, count:number, parent:Firework) {
        for (let i = 0; i < count; i++) {
            this.create(type, parent);
        }
    }

    public update() {
        // Find the duration of the last frame in seconds
        const duration = getTimingData().lastFrameDuration * 0.001;
        if (duration <= 0) {
            return;
        }
        for (let i = 0; i < this.fireworks.length; i++) {
            const firework = this.fireworks[i];

            // Check if we need to process this firework.
            if (firework && firework.type > 0) {
                // Does it need removing?
                if (firework.update(duration)) {
                    const rule = this.rules[firework.type - 1];
                    // Delete the current firework (this doesn't affect its
                    // position and velocity for passing to the create function,
                    // just whether or not it is processed for rendering or
                    // physics.
                    firework.type = 0;
                    for (let j = 0; j < rule.payloadCount; j++) {
                        const payload = rule.payloads[j];
                        this.batchCreate(payload.type, payload.count, firework);
                    }
                }
            }
        }
        
        this.FireworksData.count = 0;
        this.FireworksData.color = [];
        this.FireworksData.position = [];
        for (let i = 0; i < this.fireworks.length; i++) {
            const firework = this.fireworks[i];
            if (firework && firework.type > 0) {
                this.FireworksData.count++;
                this.FireworksData.color.push(firework.color);
                this.FireworksData.position.push(firework.position);
            }
        }
    }

    public drawDepthPass() {
        this.drawDepth(this.FireworksData);
    }

    public drawShadowPass() {
        this.drawParticle(this.FireworksData);
    }

    public onKeyDown = (ev:KeyboardEvent) => {
        switch (ev.code) {
            case 'Digit1':
                this.create(1, null);
                break;
            case 'Digit2':
                this.create(2, null);
                break;
            case 'Digit3':
                this.create(3, null);
                break;
            case 'Digit4':
                this.create(4, null);
                break;
            case 'Digit5':
                this.create(5, null);
                break;
            case 'Digit6':
                this.create(6, null);
                break;
            case 'Digit7':
                this.create(7, null);
                break;
            case 'Digit8':
                this.create(8, null);
                break;
            case 'Digit9':
                this.create(9, null);
                break;
        }
    }
}

export function getApplication(regl:REGL) {
    return new FireworksDemo(regl);
}