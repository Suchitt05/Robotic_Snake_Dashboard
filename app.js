/**
 * SERPENT-X DISASTER RESCUE ROBOTIC SNAKE DASHBOARD CONTROLLER
 * Full Telemetry, Life-Support Controls, Camera FX, & Articulation Canvas
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // GLOBAL STATE & TELEMETRY
    // ==========================================
    const state = {
        // System Status
        connected: true,
        estopActive: false,
        soundEnabled: true,
        activeScenario: 'normal',
        
        // Robot Movement State
        direction: 'STOP', // FWD, REV, LEFT, RIGHT, STOP
        gaitMode: 'serpentine', // serpentine, creep, sidewinding
        speed: 65,
        segmentCount: 6,
        wavePhase: 0,
        jointAngles: [0, 0, 0, 0, 0, 0],

        // Motor Telemetry
        m1: { rpm: 0, current: 0, temp: 34.2 },
        m2: { rpm: 0, current: 0, temp: 35.1 },

        // Optics / Camera State
        cameraMode: 'normal', // normal, thermal, nv
        ledBrightness: 85,
        strobeOn: false,

        // Life Support: Oxygen
        oxValveOpen: true,
        oxTargetFlow: 5.0, // L/min
        oxActualFlow: 5.0,
        oxPressure: 4.2, // Bar
        oxTankPct: 88.0,

        // Life Support: Liquid Food
        foodPumpMode: 'slow', // off, slow, purge
        foodFlow: 25.0, // ml/min
        foodPressure: 2.8, // Bar
        foodResPct: 75.0,
        foodClogged: false,

        // Environmental Sensors
        temp: 26.8,
        humidity: 62.0,
        pressure: 101.3,
        gasPpm: 14,
        gasHazard: false,
        distanceCm: 42,

        // IMU Attitude
        pitch: 4.2,
        roll: -1.8,
        yaw: 184.5,

        // Power & Tether
        tetherVoltage: 48.2,
        tetherCurrent: 4.7,
        tetherPayout: 24.5,
        signalDbm: -42
    };

    // ==========================================
    // AUDIO SYNTHESIZER (WEB AUDIO API)
    // ==========================================
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
    }

    function playBeep(freq = 800, type = 'sine', duration = 0.08) {
        if (!state.soundEnabled) return;
        try {
            initAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context policy fallback
        }
    }

    function playAlarmSound() {
        if (!state.soundEnabled) return;
        playBeep(950, 'sawtooth', 0.25);
    }

    // ==========================================
    // UI DOM REFERENCES
    // ==========================================
    const els = {
        // Headers & Badges
        connectionStatus: document.getElementById('connectionStatus'),
        hdrSignal: document.getElementById('hdrSignal'),
        hdrVoltage: document.getElementById('hdrVoltage'),
        hdrPayout: document.getElementById('hdrPayout'),
        scenarioSelect: document.getElementById('scenarioSelect'),
        btnAudioToggle: document.getElementById('btnAudioToggle'),
        btnExportLog: document.getElementById('btnExportLog'),
        btnEstop: document.getElementById('btnEstop'),

        // Alert Banner
        alertBanner: document.getElementById('alertBanner'),
        alertMessage: document.getElementById('alertMessage'),
        btnDismissAlert: document.getElementById('btnDismissAlert'),

        // Camera
        cameraCanvas: document.getElementById('cameraCanvas'),
        btnCamNormal: document.getElementById('btnCamNormal'),
        btnCamThermal: document.getElementById('btnCamThermal'),
        btnCamNV: document.getElementById('btnCamNV'),
        ledBrightnessSlider: document.getElementById('ledBrightnessSlider'),
        ledVal: document.getElementById('ledVal'),
        btnStrobeToggle: document.getElementById('btnStrobeToggle'),
        btnSnapPhoto: document.getElementById('btnSnapPhoto'),
        camDistanceReadout: document.getElementById('camDistanceReadout'),
        camPitchReadout: document.getElementById('camPitchReadout'),
        camTempReadout: document.getElementById('camTempReadout'),
        camModeBadge: document.getElementById('camModeBadge'),

        // Movement Controls
        btnFwd: document.getElementById('btnFwd'),
        btnRev: document.getElementById('btnRev'),
        btnLeft: document.getElementById('btnLeft'),
        btnRight: document.getElementById('btnRight'),
        btnStop: document.getElementById('btnStop'),
        btnGaitWave: document.getElementById('btnGaitWave'),
        btnGaitCreep: document.getElementById('btnGaitCreep'),
        btnGaitSide: document.getElementById('btnGaitSide'),
        speedSlider: document.getElementById('speedSlider'),
        speedVal: document.getElementById('speedVal'),
        snakeCanvas: document.getElementById('snakeCanvas'),
        m1Rpm: document.getElementById('m1Rpm'),
        m1Current: document.getElementById('m1Current'),
        m1Temp: document.getElementById('m1Temp'),
        m2Rpm: document.getElementById('m2Rpm'),
        m2Current: document.getElementById('m2Current'),
        m2Temp: document.getElementById('m2Temp'),

        // Life Support: O2
        oxPressureVal: document.getElementById('oxPressureVal'),
        oxFlowVal: document.getElementById('oxFlowVal'),
        oxTankPct: document.getElementById('oxTankPct'),
        oxTankFill: document.getElementById('oxTankFill'),
        btnOxValve: document.getElementById('btnOxValve'),
        oxFlowRegulator: document.getElementById('oxFlowRegulator'),
        oxRegVal: document.getElementById('oxRegVal'),

        // Life Support: Food
        foodPressureVal: document.getElementById('foodPressureVal'),
        foodFlowVal: document.getElementById('foodFlowVal'),
        foodResPct: document.getElementById('foodResPct'),
        foodResFill: document.getElementById('foodResFill'),
        btnFoodOff: document.getElementById('btnFoodOff'),
        btnFoodLow: document.getElementById('btnFoodLow'),
        btnFoodHigh: document.getElementById('btnFoodHigh'),
        pumpStatusTxt: document.getElementById('pumpStatusTxt'),

        // Environmental Telemetry
        valTemp: document.getElementById('valTemp'),
        statTemp: document.getElementById('statTemp'),
        valHumidity: document.getElementById('valHumidity'),
        statHumidity: document.getElementById('statHumidity'),
        valPressure: document.getElementById('valPressure'),
        valGas: document.getElementById('valGas'),
        statGas: document.getElementById('statGas'),
        gasTile: document.getElementById('gasTile'),
        valDistance: document.getElementById('valDistance'),
        valPower: document.getElementById('valPower'),
        valCurrent: document.getElementById('valCurrent'),

        // IMU
        imuCanvas: document.getElementById('imuCanvas'),
        valPitch: document.getElementById('valPitch'),
        valRoll: document.getElementById('valRoll'),
        valYaw: document.getElementById('valYaw'),

        // Blueprint
        bpTitle: document.getElementById('bpTitle'),
        bpDesc: document.getElementById('bpDesc')
    };

    // ==========================================
    // EVENT LISTENERS & HARDWARE INTERACTION
    // ==========================================

    // Scenario Preset Selection
    els.scenarioSelect.addEventListener('change', (e) => {
        state.activeScenario = e.target.value;
        playBeep(600, 'sine', 0.1);

        if (state.activeScenario === 'victim_found') {
            state.oxValveOpen = true;
            state.oxTargetFlow = 7.5;
            state.foodPumpMode = 'slow';
            state.distanceCm = 15;
            showAlert('VICTIM LOCATED! AUTOMATIC OXYGEN FLOW INCREASED TO 7.5 L/MIN.');
        } else if (state.activeScenario === 'gas_hazard') {
            state.gasPpm = 450;
            state.gasHazard = true;
            showAlert('CRITICAL HAZARD: HIGH CARBON MONOXIDE (CO) DETECTED AT 450 PPM!');
            playAlarmSound();
        } else if (state.activeScenario === 'tether_strain') {
            state.tetherVoltage = 42.1;
            state.tetherCurrent = 8.2;
            showAlert('WARNING: HIGH TETHER TENSION DETECTED (VOLTAGE DROP TO 42.1V).');
        } else if (state.activeScenario === 'food_clog') {
            state.foodClogged = true;
            state.foodPressure = 5.8;
            state.foodFlow = 0;
            showAlert('ALERT: LIQUID NUTRITION LINE OBSTRUCTION / HIGH PRESSURE (5.8 BAR).');
        } else {
            // Normal
            state.gasPpm = 14;
            state.gasHazard = false;
            state.tetherVoltage = 48.2;
            state.tetherCurrent = 4.7;
            state.foodClogged = false;
            state.oxTargetFlow = 5.0;
            hideAlert();
        }
    });

    // Sound FX Toggle
    els.btnAudioToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        document.getElementById('audioIcon').innerText = state.soundEnabled ? '🔊' : '🔇';
    });

    // E-STOP Button
    els.btnEstop.addEventListener('click', toggleEstop);
    function toggleEstop() {
        state.estopActive = !state.estopActive;
        playBeep(state.estopActive ? 300 : 800, 'sawtooth', 0.3);

        if (state.estopActive) {
            state.direction = 'STOP';
            state.oxValveOpen = false;
            state.foodPumpMode = 'off';
            els.btnEstop.innerText = 'RESUME SYSTEM';
            els.btnEstop.classList.add('active');
            showAlert('EMERGENCY STOP (E-STOP) ACTIVATED! ALL MOTORS AND PUMPS SHUT DOWN.');
        } else {
            els.btnEstop.innerText = 'E-STOP';
            els.btnEstop.classList.remove('active');
            hideAlert();
        }
        updateMovementUI();
        updateLifeSupportUI();
    }

    // Directional D-Pad Controls
    const dpadButtons = [
        { btn: els.btnFwd, dir: 'FWD' },
        { btn: els.btnRev, dir: 'REV' },
        { btn: els.btnLeft, dir: 'LEFT' },
        { btn: els.btnRight, dir: 'RIGHT' },
        { btn: els.btnStop, dir: 'STOP' }
    ];

    dpadButtons.forEach(({ btn, dir }) => {
        btn.addEventListener('click', () => {
            if (state.estopActive) return;
            state.direction = dir;
            playBeep(700, 'sine', 0.05);
            updateMovementUI();
        });
    });

    function updateMovementUI() {
        dpadButtons.forEach(({ btn, dir }) => {
            btn.classList.toggle('active', state.direction === dir);
        });
    }

    // Gait Buttons
    els.btnGaitWave.addEventListener('click', () => setGait('serpentine', els.btnGaitWave));
    els.btnGaitCreep.addEventListener('click', () => setGait('creep', els.btnGaitCreep));
    els.btnGaitSide.addEventListener('click', () => setGait('sidewinding', els.btnGaitSide));

    function setGait(gait, activeBtn) {
        state.gaitMode = gait;
        playBeep(650, 'sine', 0.05);
        [els.btnGaitWave, els.btnGaitCreep, els.btnGaitSide].forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // Speed Slider
    els.speedSlider.addEventListener('input', (e) => {
        state.speed = parseInt(e.target.value, 10);
        els.speedVal.innerText = `${state.speed}%`;
    });

    // Camera Mode Selectors
    els.btnCamNormal.addEventListener('click', () => setCamMode('normal', els.btnCamNormal, 'VISUAL LIGHT'));
    els.btnCamThermal.addEventListener('click', () => setCamMode('thermal', els.btnCamThermal, 'FLIR THERMAL'));
    els.btnCamNV.addEventListener('click', () => setCamMode('nv', els.btnCamNV, 'NIGHT VISION'));

    function setCamMode(mode, activeBtn, badgeTxt) {
        state.cameraMode = mode;
        playBeep(750, 'sine', 0.05);
        [els.btnCamNormal, els.btnCamThermal, els.btnCamNV].forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
        els.camModeBadge.innerText = badgeTxt;
    }

    // LED Slider & Aux Optics
    els.ledBrightnessSlider.addEventListener('input', (e) => {
        state.ledBrightness = parseInt(e.target.value, 10);
        els.ledVal.innerText = `${state.ledBrightness}%`;
    });

    els.btnStrobeToggle.addEventListener('click', () => {
        state.strobeOn = !state.strobeOn;
        playBeep(600, 'sine', 0.05);
        els.btnStrobeToggle.innerText = `STROBE: ${state.strobeOn ? 'ON' : 'OFF'}`;
        els.btnStrobeToggle.classList.toggle('active', state.strobeOn);
    });

    els.btnSnapPhoto.addEventListener('click', () => {
        playBeep(1200, 'sine', 0.15);
        showAlert(`SNAPSHOT CAPTURED & SAVED TO TETHER STORAGE (${new Date().toLocaleTimeString()})`);
        setTimeout(hideAlert, 2500);
    });

    // Oxygen Controls
    els.btnOxValve.addEventListener('click', () => {
        if (state.estopActive) return;
        state.oxValveOpen = !state.oxValveOpen;
        playBeep(550, 'sine', 0.05);
        updateLifeSupportUI();
    });

    els.oxFlowRegulator.addEventListener('input', (e) => {
        state.oxTargetFlow = parseFloat(e.target.value);
        els.oxRegVal.innerText = `${state.oxTargetFlow.toFixed(1)} L/m`;
    });

    // Liquid Food Controls
    els.btnFoodOff.addEventListener('click', () => setFoodMode('off', els.btnFoodOff));
    els.btnFoodLow.addEventListener('click', () => setFoodMode('slow', els.btnFoodLow));
    els.btnFoodHigh.addEventListener('click', () => setFoodMode('purge', els.btnFoodHigh));

    function setFoodMode(mode, btn) {
        if (state.estopActive) return;
        state.foodPumpMode = mode;
        playBeep(580, 'sine', 0.05);
        [els.btnFoodOff, els.btnFoodLow, els.btnFoodHigh].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateLifeSupportUI();
    }

    function updateLifeSupportUI() {
        els.btnOxValve.innerText = state.oxValveOpen ? 'OPEN' : 'CLOSED';
        els.btnOxValve.classList.toggle('active', state.oxValveOpen);
    }

    // Export Logs
    els.btnExportLog.addEventListener('click', () => {
        playBeep(900, 'sine', 0.1);
        const logData = `TIMESTAMP,PITCH,ROLL,YAW,TEMP,HUMIDITY,CO_PPM,O2_FLOW,FOOD_FLOW,TETHER_V\n` +
            `${new Date().toISOString()},${state.pitch},${state.roll},${state.yaw},${state.temp},${state.humidity},${state.gasPpm},${state.oxActualFlow},${state.foodFlow},${state.tetherVoltage}`;
        
        const blob = new Blob([logData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SERPENT-X_Log_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Alert Banner Functions
    function showAlert(msg) {
        els.alertMessage.innerText = msg;
        els.alertBanner.classList.remove('hidden');
    }

    function hideAlert() {
        els.alertBanner.classList.add('hidden');
    }

    els.btnDismissAlert.addEventListener('click', hideAlert);

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        const key = e.key.toUpperCase();
        if (key === 'W' || e.key === 'ArrowUp') { state.direction = 'FWD'; updateMovementUI(); }
        else if (key === 'S' || e.key === 'ArrowDown') { state.direction = 'REV'; updateMovementUI(); }
        else if (key === 'A' || e.key === 'ArrowLeft') { state.direction = 'LEFT'; updateMovementUI(); }
        else if (key === 'D' || e.key === 'ArrowRight') { state.direction = 'RIGHT'; updateMovementUI(); }
        else if (e.key === ' ') { state.direction = 'STOP'; updateMovementUI(); }
        else if (key === 'O') { state.oxValveOpen = !state.oxValveOpen; updateLifeSupportUI(); }
        else if (key === 'F') { setFoodMode(state.foodPumpMode === 'off' ? 'slow' : 'off', state.foodPumpMode === 'off' ? els.btnFoodLow : els.btnFoodOff); }
        else if (e.key === 'Escape') { toggleEstop(); }
    });

    // ==========================================
    // BLUEPRINT MODULE INSPECTOR INTERACTION
    // ==========================================
    const bpModules = document.querySelectorAll('.blueprint-module');
    bpModules.forEach(mod => {
        mod.addEventListener('click', () => {
            bpModules.forEach(m => m.classList.remove('selected'));
            mod.classList.add('selected');
            
            const title = mod.getAttribute('data-title');
            const desc = mod.getAttribute('data-desc');
            playBeep(850, 'sine', 0.05);

            els.bpTitle.innerText = title;
            els.bpDesc.innerText = desc;
        });
    });


    // ==========================================
    // REAL-TIME CANVAS RENDERERS
    // ==========================================

    // 1. FRONT CAMERA CANVAS SIMULATOR
    const camCtx = els.cameraCanvas.getContext('2d');

    function renderCameraFeed() {
        const w = els.cameraCanvas.width;
        const h = els.cameraCanvas.height;

        // Background Disaster Rubble Simulation
        camCtx.fillStyle = '#0a0e14';
        camCtx.fillRect(0, 0, w, h);

        // Draw Simulated Concrete Debris Shapes
        camCtx.fillStyle = '#1e293b';
        camCtx.beginPath();
        camCtx.moveTo(40, h);
        camCtx.lineTo(120, h - 80);
        camCtx.lineTo(220, h - 40);
        camCtx.lineTo(340, h - 140);
        camCtx.lineTo(480, h - 30);
        camCtx.lineTo(600, h);
        camCtx.fill();

        // Strobe Effect
        if (state.strobeOn && Math.floor(Date.now() / 150) % 2 === 0) {
            camCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            camCtx.fillRect(0, 0, w, h);
        }

        // Apply Thermal or Night Vision Shading
        if (state.cameraMode === 'thermal') {
            // FLIR Thermal Overlay Shader
            const grad = camCtx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
            grad.addColorStop(0, 'rgba(255, 0, 100, 0.7)');
            grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.5)');
            grad.addColorStop(0.8, 'rgba(59, 130, 246, 0.3)');
            grad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
            camCtx.fillStyle = grad;
            camCtx.fillRect(0, 0, w, h);

            // Victim Heat Signature Simulation if scenario active
            if (state.activeScenario === 'victim_found') {
                camCtx.fillStyle = 'rgba(255, 255, 200, 0.9)';
                camCtx.beginPath();
                camCtx.arc(w / 2 + 30, h / 2 - 20, 35, 0, Math.PI * 2);
                camCtx.fill();
                camCtx.fillStyle = '#ff0000';
                camCtx.font = '700 12px Share Tech Mono';
                camCtx.fillText('BODY HEAT DETECTED (36.8°C)', w / 2 - 40, h / 2 - 65);
            }
        } else if (state.cameraMode === 'nv') {
            // Night Vision Green Phosphor
            camCtx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            camCtx.fillRect(0, 0, w, h);

            // Scanlines
            camCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let y = 0; y < h; y += 4) {
                camCtx.fillRect(0, y, w, 2);
            }
        }

        // LED Brightness Overlay
        const darkAlpha = (100 - state.ledBrightness) / 130;
        camCtx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
        camCtx.fillRect(0, 0, w, h);

        // Distance Target Box
        camCtx.strokeStyle = state.distanceCm < 20 ? '#ef4444' : '#00f0ff';
        camCtx.lineWidth = 1.5;
        camCtx.strokeRect(w / 2 - 50, h / 2 - 35, 100, 70);
    }


    // 2. 6-SEGMENT SNAKE POSE & JOINT ARTICULATION CANVAS
    const snakeCtx = els.snakeCanvas.getContext('2d');

    function renderSnakePose() {
        const w = els.snakeCanvas.width;
        const h = els.snakeCanvas.height;

        snakeCtx.clearRect(0, 0, w, h);

        // Update undulation wave phase if moving
        if (state.direction !== 'STOP') {
            const spdFactor = state.speed / 100;
            state.wavePhase += (state.direction === 'REV' ? -0.12 : 0.12) * spdFactor;
        }

        const segments = 6;
        const segWidth = 36;
        const startX = 50;
        const centerY = h / 2;

        snakeCtx.lineWidth = 14;
        snakeCtx.lineCap = 'round';
        snakeCtx.lineJoin = 'round';

        // Calculate joint wave positions
        const points = [];
        for (let i = 0; i <= segments; i++) {
            let offset = 0;
            if (state.gaitMode === 'serpentine') {
                offset = Math.sin(state.wavePhase + i * 0.8) * (state.direction === 'STOP' ? 8 : 26);
            } else if (state.gaitMode === 'creep') {
                offset = Math.sin(state.wavePhase + i * 1.5) * 10;
            } else if (state.gaitMode === 'sidewinding') {
                offset = (i % 2 === 0 ? 1 : -1) * Math.sin(state.wavePhase) * 20;
            }

            // Steering bias
            if (state.direction === 'LEFT') offset -= (segments - i) * 5;
            if (state.direction === 'RIGHT') offset += (segments - i) * 5;

            points.push({ x: startX + i * segWidth, y: centerY + offset });
        }

        // Draw Snake Spine / Body Line
        snakeCtx.beginPath();
        snakeCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            snakeCtx.lineTo(points[i].x, points[i].y);
        }
        snakeCtx.strokeStyle = '#0f172a';
        snakeCtx.stroke();

        // Draw Treaded Segments
        for (let i = 0; i < segments; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            snakeCtx.save();
            snakeCtx.translate(midX, midY);
            snakeCtx.rotate(angle);

            // Segment Rect (Carbon tread)
            snakeCtx.fillStyle = (i === 0) ? '#00f0ff' : (i === 5 ? '#a855f7' : '#334155');
            snakeCtx.fillRect(-14, -10, 28, 20);

            // Joint Ring Highlight
            snakeCtx.strokeStyle = '#00f0ff';
            snakeCtx.lineWidth = 2;
            snakeCtx.strokeRect(-14, -10, 28, 20);

            snakeCtx.restore();
        }

        // Draw Camera Head (Segment 0 Head)
        const head = points[0];
        snakeCtx.fillStyle = '#00f0ff';
        snakeCtx.beginPath();
        snakeCtx.arc(head.x - 4, head.y, 8, 0, Math.PI * 2);
        snakeCtx.fill();
    }


    // 3. 3D IMU ARTIFICIAL HORIZON CANVAS
    const imuCtx = els.imuCanvas.getContext('2d');

    function renderIMUHorizon() {
        const w = els.imuCanvas.width;
        const h = els.imuCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        imuCtx.clearRect(0, 0, w, h);

        imuCtx.save();
        imuCtx.translate(cx, cy);
        imuCtx.rotate((state.roll * Math.PI) / 180);

        const pitchPx = state.pitch * 1.5;

        // Sky & Ground Rects
        imuCtx.fillStyle = '#0369a1'; // Sky Blue
        imuCtx.fillRect(-w, -h * 2 + pitchPx, w * 2, h * 2);

        imuCtx.fillStyle = '#78350f'; // Earth Brown
        imuCtx.fillRect(-w, pitchPx, w * 2, h * 2);

        // Horizon Line
        imuCtx.strokeStyle = '#fff';
        imuCtx.lineWidth = 2;
        imuCtx.beginPath();
        imuCtx.moveTo(-w, pitchPx);
        imuCtx.lineTo(w, pitchPx);
        imuCtx.stroke();

        imuCtx.restore();

        // Fixed Reticle Overlay
        imuCtx.strokeStyle = '#00f0ff';
        imuCtx.lineWidth = 2;
        imuCtx.beginPath();
        imuCtx.moveTo(cx - 30, cy);
        imuCtx.lineTo(cx - 10, cy);
        imuCtx.lineTo(cx, cy + 8);
        imuCtx.lineTo(cx + 10, cy);
        imuCtx.lineTo(cx + 30, cy);
        imuCtx.stroke();

        // Outer Ring
        imuCtx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        imuCtx.beginPath();
        imuCtx.arc(cx, cy, 45, 0, Math.PI * 2);
        imuCtx.stroke();
    }


    // ==========================================
    // TELEMETRY SIMULATION LOOP (10 Hz)
    // ==========================================
    setInterval(() => {
        if (!state.connected || state.estopActive) {
            state.m1.rpm = 0;
            state.m1.current = 0;
            state.m2.rpm = 0;
            state.m2.current = 0;
            state.oxActualFlow = 0;
            state.foodFlow = 0;
            updateReadoutDOM();
            return;
        }

        // Motor Telemetry Dynamics
        if (state.direction !== 'STOP') {
            const baseRpm = Math.floor(state.speed * 22);
            state.m1.rpm = baseRpm + Math.floor(Math.random() * 20 - 10);
            state.m2.rpm = baseRpm + Math.floor(Math.random() * 20 - 10);
            state.m1.current = parseFloat((1.2 + (state.speed / 100) * 2.0).toFixed(1));
            state.m2.current = parseFloat((1.1 + (state.speed / 100) * 2.0).toFixed(1));
        } else {
            state.m1.rpm = 0;
            state.m2.rpm = 0;
            state.m1.current = 0.2;
            state.m2.current = 0.2;
        }

        // Oxygen Flow Dynamics
        if (state.oxValveOpen) {
            state.oxActualFlow = parseFloat((state.oxTargetFlow + (Math.random() * 0.2 - 0.1)).toFixed(1));
            state.oxTankPct = Math.max(0, parseFloat((state.oxTankPct - 0.005).toFixed(2)));
        } else {
            state.oxActualFlow = 0;
        }

        // Liquid Food Flow Dynamics
        if (state.foodPumpMode !== 'off' && !state.foodClogged) {
            state.foodFlow = state.foodPumpMode === 'slow' ? 25 : 60;
            state.foodResPct = Math.max(0, parseFloat((state.foodResPct - 0.01).toFixed(2)));
            state.foodPressure = 2.8;
        } else if (state.foodClogged) {
            state.foodFlow = 0;
            state.foodPressure = 5.8;
        } else {
            state.foodFlow = 0;
            state.foodPressure = 0.5;
        }

        // Minor Telemetry Jitter
        state.temp = parseFloat((26.8 + Math.sin(Date.now() / 5000) * 0.4).toFixed(1));
        state.humidity = Math.floor(62 + Math.cos(Date.now() / 4000) * 2);
        state.pitch = parseFloat((4.2 + Math.sin(Date.now() / 2000) * 0.5).toFixed(1));
        state.roll = parseFloat((-1.8 + Math.cos(Date.now() / 3000) * 0.3).toFixed(1));

        updateReadoutDOM();
    }, 100);

    // Main Render Loop (60 FPS)
    function animLoop() {
        renderCameraFeed();
        renderSnakePose();
        renderIMUHorizon();
        requestAnimationFrame(animLoop);
    }
    requestAnimationFrame(animLoop);

    // Update DOM Readouts
    function updateReadoutDOM() {
        // Motors
        els.m1Rpm.innerText = state.m1.rpm.toLocaleString();
        els.m1Current.innerText = `${state.m1.current} A`;
        els.m2Rpm.innerText = state.m2.rpm.toLocaleString();
        els.m2Current.innerText = `${state.m2.current} A`;

        // O2 & Food
        els.oxPressureVal.innerText = state.oxPressure.toFixed(1);
        els.oxFlowVal.innerText = state.oxActualFlow.toFixed(1);
        els.oxTankPct.innerText = `${state.oxTankPct.toFixed(0)}%`;
        els.oxTankFill.style.width = `${state.oxTankPct}%`;

        els.foodPressureVal.innerText = state.foodPressure.toFixed(1);
        els.foodFlowVal.innerText = state.foodFlow.toFixed(0);
        els.foodResPct.innerText = `${state.foodResPct.toFixed(0)}%`;
        els.foodResFill.style.width = `${state.foodResPct}%`;

        els.pumpStatusTxt.innerText = state.foodClogged ? 'CLOGGED / HIGH PRESSURE' : (state.foodPumpMode === 'off' ? 'STANDBY' : 'PUMPING NORMAL (1,200 RPM)');
        els.pumpStatusTxt.className = state.foodClogged ? 'red' : 'green';

        // Sensors
        els.valTemp.innerHTML = `${state.temp} <span class="unit">°C</span>`;
        els.valHumidity.innerHTML = `${state.humidity} <span class="unit">%</span>`;
        els.valGas.innerHTML = `${state.gasPpm} <span class="unit">PPM</span>`;

        if (state.gasPpm > 100) {
            els.statGas.innerText = 'HAZARD LEVEL!';
            els.statGas.className = 'tile-status hazard';
            els.valGas.className = 'tile-val hazard';
        } else {
            els.statGas.innerText = 'SAFE LEVEL';
            els.statGas.className = 'tile-status green';
            els.valGas.className = 'tile-val';
        }

        els.valPitch.innerText = `${state.pitch > 0 ? '+' : ''}${state.pitch}°`;
        els.valRoll.innerText = `${state.roll > 0 ? '+' : ''}${state.roll}°`;
        els.valYaw.innerText = `${state.yaw}°`;

        els.camPitchReadout.innerText = `${state.pitch > 0 ? '+' : ''}${state.pitch}°`;
        els.camTempReadout.innerText = `${state.temp}°C`;

        const totalWatts = ((state.m1.current + state.m2.current + 1.2) * state.tetherVoltage).toFixed(1);
        els.valPower.innerHTML = `${totalWatts} <span class="unit">W</span>`;
        els.valCurrent.innerText = `${(state.m1.current + state.m2.current + 1.2).toFixed(1)} A @ ${state.tetherVoltage}V`;
    }
});
