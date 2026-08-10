const MAX_DELAY = 8192;

class StringProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'frequency', defaultValue: 220, minValue: 15, maxValue: 6000, automationRate: 'a-rate' },
            // How much energy survives each round trip. 1 = endless, 0.99 = short.
            { name: 'loopGain', defaultValue: 0.999, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            // Loop lowpass: higher values dull the tone faster, like a thicker string.
            { name: 'damping', defaultValue: 0.35, minValue: 0, maxValue: 0.999, automationRate: 'k-rate' },
            { name: 'jawari', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
        ];
    }

    constructor() {
        super();
        this.buf = new Float32Array(MAX_DELAY);
        this.w = 0;
        this.lp = 0;
        this.dcX = 0;
        this.dcY = 0;
        this.ex = null;
        this.exIdx = 0;
        this.pending = null;

        this.port.onmessage = (event) => {
            const msg = event.data;
            if (msg.type === 'pluck') {
                this.pending = msg;
            } else if (msg.type === 'silence') {
                this.buf.fill(0);
                this.lp = 0;
                this.dcX = 0;
                this.dcY = 0;
                this.ex = null;
            }
        };
    }

    /** Build one period of excitation: filtered noise, combed by pluck position. */
    buildExcitation(period, velocity, brightness, position) {
        const len = Math.max(2, Math.floor(period));
        const raw = new Float32Array(len);
        // One-pole lowpass on the noise burst. A soft pluck (low brightness) is a
        // finger; a hard one is a mizrab or hammer.
        const a = 0.08 + 0.92 * brightness;
        let lp = 0;
        for (let i = 0; i < len; i++) {
            const n = Math.random() * 2 - 1;
            lp += a * (n - lp);
            raw[i] = lp;
        }
        // Plucking at a point along the string cancels the harmonics with a node
        // there — a comb filter with that delay reproduces it.
        const off = Math.max(1, Math.min(len - 1, Math.floor(len * position)));
        const out = new Float32Array(len);
        let peak = 1e-6;
        for (let i = 0; i < len; i++) {
            out[i] = raw[i] - (i >= off ? raw[i - off] : 0);
            const m = Math.abs(out[i]);
            if (m > peak) peak = m;
        }
        const scale = velocity / peak;
        for (let i = 0; i < len; i++) out[i] *= scale;
        return out;
    }

    process(_inputs, outputs, params) {
        const out = outputs[0][0];
        if (!out) return true;

        const freqArr = params.frequency;
        const freqConst = freqArr.length === 1;
        const loopGain = params.loopGain[0];
        const damping = params.damping[0];
        const jawari = params.jawari[0];

        if (this.pending) {
            const f = freqConst ? freqArr[0] : freqArr[0];
            const period = Math.max(2, Math.min(MAX_DELAY - 4, sampleRate / f));

            this.ex = this.buildExcitation(
                period,
                this.pending.velocity,
                this.pending.brightness,
                this.pending.position
            );
            this.exIdx = 0;
            this.pending = null;

        }
        const buf = this.buf;
        const damp = 1 - damping;

        const thresh = jawari > 0 ? 0.28 - 0.22 * jawari : 0;

        for (let i = 0; i < out.length; i++) {
            const f = freqConst ? freqArr[0] : freqArr[i];
            let d = sampleRate / f - 0.5; // the loop filter adds ~half a sample
            if (d < 2) d = 2;
            else if (d > MAX_DELAY - 4) d = MAX_DELAY - 4;

            let rp = this.w - d;
            if (rp < 0) rp += MAX_DELAY;
            const i0 = rp | 0;
            const frac = rp - i0;
            const i1 = i0 + 1 >= MAX_DELAY ? 0 : i0 + 1;
            const s = buf[i0] + frac * (buf[i1] - buf[i0]);

            this.lp += damp * (s - this.lp);
            let y = this.lp * loopGain;

            if (thresh > 0) {
                if (y > thresh) y = thresh + (y - thresh) * 0.55;
                else if (y < -thresh) y = -thresh + (y + thresh) * 0.92;
            }


            const yIn = y;
            y = yIn - this.dcX + 0.9975 * this.dcY;
            this.dcX = yIn;
            this.dcY = y;

            let inj = 0;
            if (this.ex && this.exIdx < this.ex.length) inj = this.ex[this.exIdx++];

            buf[this.w] = y + inj;
            out[i] = y;
            this.w = this.w + 1 >= MAX_DELAY ? 0 : this.w + 1;
        }

        return true;
    }
}

registerProcessor('string-processor', StringProcessor);
