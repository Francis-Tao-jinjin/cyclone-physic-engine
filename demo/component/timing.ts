class TimingData {

    public isPaused:boolean = false;
    public frameNumber = 0;
    public lastFrameTimestamp = Date.now();
    public lastFrameDuration = 0;
    public averageFrameDuration = 0;
    public fps = 0;

    constructor() {
        this.init();
    }

    public init() {
        this.isPaused = false;
        this.frameNumber = 0;
        this.lastFrameTimestamp = Date.now();
        this.lastFrameDuration = 0;
        this.averageFrameDuration = 0;
        this.fps = 0;
    }

    // Updates the global frame information. Should be called once per frame.
    public update() {
        // Advance the frame number.
        if (!this.isPaused) {
            this.frameNumber++;
        }

        // Update the timing information.
        const curTime = Date.now();
        this.lastFrameDuration = curTime - this.lastFrameTimestamp;
        this.lastFrameTimestamp = curTime;
        
        // Update the RWA frame rate if we are able to.
        if (this.frameNumber > 1) {
            if (this.averageFrameDuration <= 0) {
                this.averageFrameDuration = this.lastFrameDuration;
            } else {
                // 滑动窗口平均法
                // RWA over 100 frames.
                this.averageFrameDuration *= 0.99;
                this.averageFrameDuration +=
                    0.01 * this.lastFrameDuration;
                
                this.fps = 1000 / this.averageFrameDuration;
            }
        }
        // console.log('frameNumber', this.frameNumber, 'avgDuration', this.averageFrameDuration);
    }
}

const globalTiming = new TimingData();

export function getTimingData() {
    return globalTiming;
}



