const canvas = document.getElementById('cosmos-canvas');

if (canvas) {
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width, height;
    let scrollY = window.scrollY;

    // --- CONFIGURATION ---
    const BG_COLOR = '#121418';
    const STAR_COUNT = 340;
    const MERGER_OFFSET_X = 0.84;
    const MERGER_OFFSET_Y = 0.34;
    const GW_SPEED = 4.5;

    // --- STATE MANAGEMENT ---
    let simState = {
        phase: 0,
        t: 0,
        theta: 0,
        omega: 0.045,
        radius: 88,
        gwRadius: 0
    };

    const STAR_COLORS = [
        { h: 210, s: 55, l: 78 },
        { h: 220, s: 35, l: 86 },
        { h: 36, s: 65, l: 82 }
    ];

    class Star {
        constructor() {
            this.reset();
            this.y = Math.random() * (height || window.innerHeight);
        }

        reset() {
            const w = width || window.innerWidth;
            const h = height || window.innerHeight;

            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.z = Math.random() * 1.8 + 0.4;
            this.size = Math.random() * 1.35 + 0.25;
            this.alpha = Math.random() * 0.45 + 0.3;
            this.baseColor = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        }

        draw(scrollPercent, gwEffect) {
            let parallaxY = (this.y - scrollY * 0.16 * this.z) % height;
            if (parallaxY < 0) parallaxY += height;

            let drawX = this.x;
            let drawY = parallaxY;

            // GW Distortion
            if (gwEffect.active) {
                const dx = this.x - gwEffect.cx;
                const dy = parallaxY - gwEffect.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const waveDist = Math.abs(dist - gwEffect.radius);

                if (waveDist < 42) {
                    const force = Math.sin((waveDist / 42) * Math.PI) * 5.5;
                    const angle = Math.atan2(dy, dx);
                    drawX += Math.cos(angle) * force;
                    drawY += Math.sin(angle) * force;
                }
            }

            // Subtle Redshift with scroll
            let currentH, currentS, currentL;
            const safeScroll = Math.max(0, Math.min(1, scrollPercent || 0));

            if (safeScroll < 0.1) {
                currentH = this.baseColor.h;
                currentS = this.baseColor.s;
                currentL = this.baseColor.l;
            } else {
                const factor = Math.min(safeScroll * 1.2, 1);
                currentH = this.baseColor.h * (1 - factor * 0.85);
                currentS = this.baseColor.s + 20 * factor;
                currentL = this.baseColor.l - 22 * factor;
            }

            ctx.fillStyle = `hsla(${currentH}, ${currentS}%, ${currentL}%, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- MERGER ANIMATION ---
    const trail1 = [];
    const trail2 = [];

    function resetMerger() {
        trail1.length = 0;
        trail2.length = 0;
        simState = {
            phase: 1,
            t: 0,
            theta: 0,
            omega: 0.045,
            radius: 88,
            gwRadius: 0
        };
    }

    function updateMerger() {
        if (simState.phase === 0) return;

        const cx = width * MERGER_OFFSET_X;
        const cy = height * MERGER_OFFSET_Y;

        // PHASE 1: INSPIRAL
        if (simState.phase === 1) {
            simState.omega = Math.min(0.45, simState.omega + 0.00025);
            simState.radius -= 0.14;
            simState.theta += simState.omega;

            if (simState.radius <= 1.5) {
                simState.phase = 2;
                simState.t = 0;
                return;
            }

            const x1 = cx + simState.radius * Math.cos(simState.theta);
            const y1 = cy + simState.radius * Math.sin(simState.theta);
            const x2 = cx + simState.radius * Math.cos(simState.theta + Math.PI);
            const y2 = cy + simState.radius * Math.sin(simState.theta + Math.PI);

            trail1.push({ x: x1, y: y1 });
            trail2.push({ x: x2, y: y2 });

            if (trail1.length > 26) trail1.shift();
            if (trail2.length > 26) trail2.shift();

            ctx.lineWidth = 1;
            for (let i = 0; i < trail1.length - 1; i++) {
                const alpha = (i / trail1.length) * 0.35;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(trail1[i].x, trail1[i].y);
                ctx.lineTo(trail1[i + 1].x, trail1[i + 1].y);
                ctx.stroke();
            }
            for (let i = 0; i < trail2.length - 1; i++) {
                const alpha = (i / trail2.length) * 0.35;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(trail2[i].x, trail2[i].y);
                ctx.lineTo(trail2[i + 1].x, trail2[i + 1].y);
                ctx.stroke();
            }

            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x1, y1, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x2, y2, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        // PHASE 2: FLASH
        else if (simState.phase === 2) {
            simState.t++;
            const alpha = 1 - simState.t / 22;

            if (alpha > 0) {
                const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 95);
                grd.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                grd.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cx, cy, 130, 0, Math.PI * 2);
                ctx.fill();
            } else {
                simState.phase = 3;
                simState.t = 0;
                simState.gwRadius = 10;
            }
        }
        // PHASE 3: KILONOVA & GW RING
        else if (simState.phase === 3) {
            simState.t += 0.5;
            simState.gwRadius += GW_SPEED;

            if (simState.gwRadius < Math.max(width, height) * 1.15) {
                const waveAlpha = Math.max(0, 0.32 - simState.gwRadius / 900);
                ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
                ctx.lineWidth = 1.25;
                ctx.beginPath();
                ctx.arc(cx, cy, simState.gwRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            const cloudRadius = 2 + Math.pow(simState.t, 0.42) * 1.4;
            const opacity = Math.max(0, 1 - simState.t / 600);

            if (opacity > 0) {
                const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudRadius);
                const progress = Math.min(1, simState.t / 400);
                const currentHue = 220 - progress * 210;

                grd.addColorStop(0, `hsla(${currentHue}, 85%, 78%, ${opacity})`);
                grd.addColorStop(0.6, `hsla(${currentHue}, 75%, 50%, ${opacity * 0.55})`);
                grd.addColorStop(1, `hsla(${currentHue}, 75%, 20%, 0)`);

                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cx, cy, cloudRadius, 0, Math.PI * 2);
                ctx.fill();
            } else if (simState.t > 900) {
                // Quiet pause before replaying the merger
                resetMerger();
            }
        }
    }

    // --- LOOP ---
    const stars = [];

    function renderFrame() {
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, width, height);

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0;

        const gwEffect = {
            active: simState.phase === 3,
            cx: width * MERGER_OFFSET_X,
            cy: height * MERGER_OFFSET_Y - scrollY * 0.35,
            radius: simState.gwRadius
        };

        for (let i = 0; i < stars.length; i++) {
            stars[i].draw(scrollPct, gwEffect);
        }

        if (!prefersReducedMotion && scrollY < height * 1.4) {
            ctx.save();
            ctx.translate(0, -scrollY * 0.35);
            updateMerger();
            ctx.restore();
        }
    }

    function loop() {
        renderFrame();
        requestAnimationFrame(loop);
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        stars.length = 0;
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push(new Star());
        }
        if (prefersReducedMotion) {
            renderFrame();
        }
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
        if (prefersReducedMotion) {
            renderFrame();
        }
    }, { passive: true });

    resize();

    if (!prefersReducedMotion) {
        setTimeout(resetMerger, 500);
        loop();
    }
}
