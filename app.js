
// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const { createClient } = supabase;
const supabaseUrl = 'https://hxzcdicsrymdmxmonsgb.supabase.co'; // <-- Paste your URL here
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4emNkaWNzcnltZG14bW9uc2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTU1NzksImV4cCI6MjA4NzMzMTU3OX0.CRq1y0fp0D9TWayM2v2eVMvoK4BtGVK0ZF6BSJ3rAkM';     // <-- Paste your Anon/Publishable Key here
const db = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const display = document.getElementById('time-display');
const modeText = document.getElementById('mode-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const circle = document.querySelector('.progress-ring__circle');
const circleCircumference = 722; 

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'block';
        renderHeatmap(); 
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('app-section').style.display = 'none';
    }
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
    } else {
        errorMsg.style.display = 'none';
        checkUser(); 
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await db.auth.signOut();
    checkUser(); 
});

// ==========================================
// 4. SIDEBAR & SETTINGS LOGIC
// ==========================================
let configFocus = 50;
let configBreak = 10;
let configIterations = 1;

const sidebar = document.getElementById('settings-sidebar');
const overlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

document.getElementById('configure-btn').addEventListener('click', toggleSidebar);
document.getElementById('close-sidebar').addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Stepper Button Logic
function setupStepper(inputId, minusId, plusId, min, max) {
    const input = document.getElementById(inputId);
    document.getElementById(minusId).addEventListener('click', () => {
        let val = parseInt(input.value);
        if (val > min) input.value = val - 1;
    });
    document.getElementById(plusId).addEventListener('click', () => {
        let val = parseInt(input.value);
        if (val < max) input.value = val + 1;
    });
}
setupStepper('focus-input', 'focus-minus', 'focus-plus', 1, 120);
setupStepper('break-input', 'break-minus', 'break-plus', 0, 30);
setupStepper('iter-input', 'iter-minus', 'iter-plus', 1, 10);

document.getElementById('save-settings-btn').addEventListener('click', () => {
    configFocus = parseInt(document.getElementById('focus-input').value);
    configBreak = parseInt(document.getElementById('break-input').value);
    configIterations = parseInt(document.getElementById('iter-input').value);
    
    if (timerId === null) {
        resetTimerState(); // Apply immediately if timer is stopped
    } else {
        alert("Settings saved. They will apply after the current countdown ends.");
    }
    toggleSidebar();
});

// ==========================================
// 5. POMODORO STATE MACHINE & TIMER LOGIC
// ==========================================
let currentIteration = 1;
let isFocusMode = true; // true = Focus, false = Break
let totalTime = configFocus * 60; 
let timeLeft = totalTime; 
let timerId = null;

function resetTimerState() {
    isFocusMode = true;
    currentIteration = 1;
    totalTime = configFocus * 60;
    timeLeft = totalTime;
    modeText.textContent = `Focus 1/${configIterations}`;
    circle.setAttribute('stroke', '#23c45e'); // Green
    updateDisplay();
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (circle) {
        const offset = circleCircumference - (timeLeft / totalTime) * circleCircumference;
        circle.style.strokeDashoffset = offset;
    }
}

function startTimer() {
    if (timerId !== null) return; 
    
    startBtn.style.backgroundColor = isFocusMode ? '#e9f8f0' : '#eaf2ff';
    startBtn.style.color = isFocusMode ? '#23c45e' : '#4a90e2';
    
    timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerId = null;
            
            if (isFocusMode) {
                saveSession(configFocus); // Only log actual study time to Supabase
                
                if (currentIteration < configIterations) {
                    // Switch to Break Mode
                    isFocusMode = false;
                    totalTime = configBreak * 60;
                    timeLeft = totalTime;
                    modeText.textContent = `Break ${currentIteration}/${configIterations}`;
                    circle.setAttribute('stroke', '#4a90e2'); // Blue ring for break
                    alert("Focus complete! Time for a break.");
                } else {
                    // Entire Pomodoro sequence is done
                    alert("All iterations complete! Data logged.");
                    resetTimerState();
                }
            } else {
                // Switch back to Focus Mode
                isFocusMode = true;
                currentIteration++;
                totalTime = configFocus * 60;
                timeLeft = totalTime;
                modeText.textContent = `Focus ${currentIteration}/${configIterations}`;
                circle.setAttribute('stroke', '#23c45e'); // Green ring for focus
                alert("Break is over! Time to focus.");
            }
            
            startBtn.style.backgroundColor = '#f0f0f4';
            startBtn.style.color = '#a0a0a5';
            updateDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    
    if (isFocusMode) {
        const minutesStudied = configFocus - Math.floor(timeLeft / 60);
        if (minutesStudied > 0) {
            saveSession(minutesStudied);
            alert(`Session stopped early. Logged ${minutesStudied} minutes.`);
        }
    } else {
        alert("Break ended early.");
    }
    
    startBtn.style.backgroundColor = '#f0f0f4';
    startBtn.style.color = '#a0a0a5';
    resetTimerState();
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);

// ==========================================
// 6. DATABASE & HEATMAP LOGIC
// ==========================================
async function saveSession(minutes) {
    const subjectName = document.getElementById('subject-select').value;
    const method = document.getElementById('method-select').value;
    const { data, error } = await db.from('study_sessions').insert([{ duration_minutes: minutes, subject: subjectName, study_method: method }]);
    if (error) console.error("Error saving data:", error);
    else renderHeatmap(); 
}

async function renderHeatmap() {
    const heatmapContainer = document.getElementById('cal-heatmap');
    if (!heatmapContainer) return;
    heatmapContainer.innerHTML = ''; 

    const { data, error } = await db.from('study_sessions').select('created_at, duration_minutes');
    if (error) return;

    let dailyTotals = {};
    data.forEach(session => {
        const date = session.created_at.split('T')[0]; 
        dailyTotals[date] = (dailyTotals[date] || 0) + session.duration_minutes;
    });

    const heatmapData = Object.keys(dailyTotals).map(dateStr => { return { date: dateStr, total: dailyTotals[dateStr] }; });

    const cal = new CalHeatmap();
    cal.paint({
        itemSelector: '#cal-heatmap',
        domain: { type: 'month' },
        subDomain: { type: 'day', width: 14, height: 14, gutter: 4, radius: 4 },
        data: { source: heatmapData, x: 'date', y: 'total' },
        date: { start: new Date(new Date().setMonth(new Date().getMonth() - 2)) }, 
        range: 6, 
        scale: {
            color: { type: 'threshold', range: ['#f0f0f4', '#ffdcdc', '#ffb0b0', '#ff8484', '#ff6b6b'], domain: [30, 60, 120, 180] }
        }
    });
}

// Initialize
resetTimerState();
checkUser();
