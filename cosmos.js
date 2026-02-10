const canvas = document.getElementById('cosmos-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let scrollY = window.scrollY;

// --- CONFIGURATION ---
const STAR_COUNT = 400;
const MERGER_OFFSET_X = 0.75; 
const MERGER_OFFSET_Y = 0.4;
const GW_SPEED = 5; // Slower wave propagation

// --- STATE MANAGEMENT ---
let simState = {
    phase: 0,
    t: 0, 
    theta: 0,        
    omega: 0.00000000005,     // Start much slower
    radius: 50,     // Start slightly wider
    gwRadius: 0
};

// --- ASSETS ---
const STAR_COLORS = [
    {h: 210, s: 70, l: 80},
    {h: 220, s: 50, l: 90},
    {h: 40, s: 80, l: 85},
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
        this.z = Math.random() * 2 + 0.5;
        this.size = Math.random() * 1.5;
        this.baseColor = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    }

    draw(scrollPercent, gwEffect) {
        let parallaxY = this.y - (scrollY * 0.2 * this.z);
        if (parallaxY < 0) parallaxY += height;
        if (parallaxY > height) parallaxY -= height;

        let drawX = this.x;
        let drawY = parallaxY;
        
        // GW Distortion
        if (gwEffect.active) {
            const dx = this.x - gwEffect.cx;
            const dy = parallaxY - gwEffect.cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const waveDist = Math.abs(dist - gwEffect.radius);
            
            // Tighter wave interaction (40px width)
            if (waveDist < 40) {
                const force = Math.sin((waveDist/40) * Math.PI) * 6;
                const angle = Math.atan2(dy, dx);
                drawX += Math.cos(angle) * force;
                drawY += Math.sin(angle) * force;
            }
        }

        // Redshift Color Calculation
        let currentH, currentS, currentL;
        const safeScroll = Math.max(0, Math.min(1, scrollPercent || 0));

        if (safeScroll < 0.1) {
            currentH = this.baseColor.h;
            currentS = this.baseColor.s;
            currentL = this.baseColor.l;
        } else {
            const factor = Math.min(safeScroll * 1.5, 1); 
            currentH = this.baseColor.h * (1 - factor); 
            currentS = this.baseColor.s + (30 * factor); 
            currentL = this.baseColor.l - (40 * factor); 
        }

        ctx.fillStyle = `hsl(${currentH}, ${currentS}%, ${currentL}%)`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- MERGER ANIMATION ---
const trail1 = [];
const trail2 = [];

function updateMerger() {
    if (simState.phase === 0) return;

    const cx = width * MERGER_OFFSET_X;
    const cy = height * MERGER_OFFSET_Y;

    // PHASE 1: INSPIRAL (Slower)
    if (simState.phase === 1) {
        // Very slow acceleration
        simState.omega += 0.00000000005; 
        if(simState.omega > 0.6) simState.omega = 0.6; // Cap speed

        // Very slow radial decay
        simState.radius -= 0.15;

        simState.theta += simState.omega;

        if (simState.radius <= 1) {
            simState.phase = 2;
            simState.t = 0;
            return;
        }

        let x1 = cx + simState.radius * Math.cos(simState.theta);
        let y1 = cy + simState.radius * Math.sin(simState.theta);
        let x2 = cx + simState.radius * Math.cos(simState.theta + Math.PI);
        let y2 = cy + simState.radius * Math.sin(simState.theta + Math.PI);

        // Trails
        trail1.push({x: x1, y: y1});
        trail2.push({x: x2, y: y2});
        
        // Slightly longer trails for smoother look at low speed
        if(trail1.length > 25) trail1.shift();
        if(trail2.length > 25) trail2.shift();

        // Draw Trails
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < trail1.length - 1; i++) {
            const alpha = (i / trail1.length) * 0.4; 
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(trail1[i].x, trail1[i].y);
            ctx.lineTo(trail1[i+1].x, trail1[i+1].y);
            ctx.stroke();
        }
        for (let i = 0; i < trail2.length - 1; i++) {
            const alpha = (i / trail2.length) * 0.4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(trail2[i].x, trail2[i].y);
            ctx.lineTo(trail2[i+1].x, trail2[i+1].y);
            ctx.stroke();
        }

        // Stars (Small compact objects)
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // PHASE 2: FLASH
    else if (simState.phase === 2) {
        simState.t++;
        let alpha = 1 - (simState.t / 20); // Quick flash
        
        if (alpha > 0) {
            // Smaller, localized flash
            let grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
            grd.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            grd.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI*2); ctx.fill();
        } else {
            simState.phase = 3;
            simState.t = 0;
            simState.gwRadius = 10;
        }
    }

    // PHASE 3: KILONOVA (Compact & Smooth Color)
    else if (simState.phase === 3) {
        simState.t += 0.5; // Slow down evolution
        simState.gwRadius += GW_SPEED;
        
        // Wave
        if (simState.gwRadius < Math.max(width, height)) {
            const waveAlpha = Math.max(0, 0.4 - simState.gwRadius/800);
            ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, simState.gwRadius, 0, Math.PI*2);
            ctx.stroke();
        }

        // Cloud - SMALLER SCALE
        // Previously: 10 + t^0.7 * 4
        // New: 5 + t^0.6 * 1.5 (Much smaller, barely bigger than the binary orbit was)
        const cloudRadius = 2 + Math.pow(simState.t, 0.4) * 1.2; 
        const opacity = Math.max(0, 1 - simState.t / 600); // Long fade

        if (opacity > 0) {
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudRadius);
            
            // Continuous Color Interpolation (Blue 220 -> Red 10)
            // Evolution lasts over 400 frames
            const progress = Math.min(1, simState.t / 400);
            const startHue = 220;
            const endHue = 10;
            const currentHue = startHue - (progress * (startHue - endHue));
            
            grd.addColorStop(0, `hsla(${currentHue}, 90%, 80%, ${opacity})`);
            grd.addColorStop(0.6, `hsla(${currentHue}, 80%, 50%, ${opacity*0.6})`);
            grd.addColorStop(1, `hsla(${currentHue}, 80%, 20%, 0)`);

            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, cloudRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- LOOP ---
const stars = [];

function init() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    
    stars.length = 0;
    for(let i=0; i<STAR_COUNT; i++) {
        stars.push(new Star());
    }

    simState = {
        phase: 0,
        t: 0, 
        theta: 0,        
        omega: 0.05,     
        radius: 100,     
        gwRadius: 0
    };

    setTimeout(() => { simState.phase = 1; }, 500);
    loop();
}

function loop() {
    ctx.fillStyle = '#05070a'; 
    ctx.fillRect(0, 0, width, height);

    let maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    let scrollPct = maxScroll > 0 ? scrollY / maxScroll : 0;

    let gwEffect = {
        active: simState.phase === 3,
        cx: width * MERGER_OFFSET_X,
        cy: height * MERGER_OFFSET_Y - (scrollY * 0.5),
        radius: simState.gwRadius
    };

    stars.forEach(star => star.draw(scrollPct, gwEffect));

    if (scrollY < height) {
        ctx.save();
        ctx.translate(0, -scrollY * 0.5);
        updateMerger();
        ctx.restore();
    }

    requestAnimationFrame(loop);
}

// Events
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    stars.length = 0; 
    for(let i=0; i<STAR_COUNT; i++) stars.push(new Star());
});

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

init();
