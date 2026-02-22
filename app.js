
// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const { createClient } = supabase;
const supabaseUrl = 'https://hxzcdicsrymdmxmonsgb.supabase.co'; // <-- Paste your URL here
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4emNkaWNzcnltZG14bW9uc2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTU1NzksImV4cCI6MjA4NzMzMTU3OX0.CRq1y0fp0D9TWayM2v2eVMvoK4BtGVK0ZF6BSJ3rAkM';     // <-- Paste your Anon/Publishable Key here
const db = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. DOM ELEMENTS & CONSTANTS
// ==========================================
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const display = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// The SVG Circle for the animation
const circle = document.querySelector('.progress-ring__circle');
const circleCircumference = 722; // 2 * pi * radius (115)

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    
    if (session) {
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        renderHeatmap(); 
    } else {
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
    }
}

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
    } else {
        errorMsg.style.display = 'none';
        checkUser(); 
    }
});

logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
    checkUser(); 
});

// ==========================================
// 4. TIMER & ANIMATION LOGIC
// ==========================================
const totalTime = 50 * 60; // 50 minutes in seconds
let timeLeft = totalTime; 
let timerId = null;

function updateDisplay() {
    // 1. Update the text numbers
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 2. Update the visual green ring
    // Calculate how much of the ring should be "empty"
    const offset = circleCircumference - (timeLeft / totalTime) * circleCircumference;
    circle.style.strokeDashoffset = offset;
}

function startTimer() {
    if (timerId !== null) return; 
    
    // Change start button color to show it's active
    startBtn.style.backgroundColor = '#e9f8f0';
    startBtn.style.color = '#23c45e';
    
    timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerId = null;
            saveSession(50); 
            alert("Focus session complete! Data logged.");
            
            // Reset UI
            timeLeft = totalTime; 
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
    
    const minutesStudied = 50 - Math.floor(timeLeft / 60);
    
    if (minutesStudied > 0) {
        saveSession(minutesStudied);
        alert(`Session stopped early. Logged ${minutesStudied} minutes.`);
    }
    
    // Reset UI
    timeLeft = totalTime; 
    startBtn.style.backgroundColor = '#f0f0f4';
    startBtn.style.color = '#a0a0a5';
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);

// ==========================================
// 5. DATABASE LOGIC (INSERT DATA)
// ==========================================
async function saveSession(minutes) {
    const subjectName = document.getElementById('subject-select').value;
    const method = document.getElementById('method-select').value;

    const { data, error } = await db
        .from('study_sessions')
        .insert([{ duration_minutes: minutes, subject: subjectName, study_method: method }]);

    if (error) {
        console.error("Error saving data:", error);
    } else {
        console.log("Session logged successfully!");
        renderHeatmap(); 
    }
}

// ==========================================
// 6. HEATMAP LOGIC (FETCH & RENDER)
// ==========================================
async function renderHeatmap() {
    document.getElementById('cal-heatmap').innerHTML = '';

    const { data, error } = await db.from('study_sessions').select('created_at, duration_minutes');
    if (error) { console.error("Error fetching data:", error); return; }

    let dailyTotals = {};
    data.forEach(session => {
        const date = session.created_at.split('T')[0]; 
        dailyTotals[date] = (dailyTotals[date] || 0) + session.duration_minutes;
    });

    const heatmapData = Object.keys(dailyTotals).map(dateStr => {
        return { date: dateStr, total: dailyTotals[dateStr] };
    });

    const cal = new CalHeatmap();
    cal.paint({
        itemSelector: '#cal-heatmap',
        domain: { type: 'month' },
        subDomain: { type: 'day', width: 15, height: 15, gutter: 4, radius: 4 }, // Added radius for rounded heatmap squares
        data: { source: heatmapData, x: 'date', y: 'total' },
        date: { start: new Date(new Date().setMonth(new Date().getMonth() - 2)) }, 
        range: 6, 
        scale: {
            color: {
                type: 'threshold',
                // Using the coral/pink tones from your reference UI
                range: ['#f0f0f4', '#ffdcdc', '#ffb0b0', '#ff8484', '#ff6b6b'], 
                domain: [30, 60, 120, 180] 
            }
        }
    });
}

// ==========================================
// INITIALIZE ON LOAD
// ==========================================
updateDisplay();
checkUser();
