
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
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const display = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    
    if (session) {
        // User is logged in
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        renderHeatmap(); 
    } else {
        // No user logged in
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
// 4. TIMER LOGIC
// ==========================================
let timeLeft = 50 * 60; // 50 minutes in seconds
let timerId = null;

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerId !== null) return; 
    
    timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerId = null;
            saveSession(50); 
            alert("Focus session complete! Data logged.");
            timeLeft = 50 * 60; 
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
    
    timeLeft = 50 * 60; 
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
        .insert([
            { 
                duration_minutes: minutes, 
                subject: subjectName,
                study_method: method
            }
        ]);

    if (error) {
        console.error("Error saving data:", error);
    } else {
        console.log("Session logged successfully!");
        renderHeatmap(); // Refresh the heatmap to show the new session
    }
}

// ==========================================
// 6. HEATMAP LOGIC (FETCH & RENDER)
// ==========================================
async function renderHeatmap() {
    // Clear the existing heatmap to prevent duplicates when refreshing
    document.getElementById('cal-heatmap').innerHTML = '';

    const { data, error } = await db
        .from('study_sessions')
        .select('created_at, duration_minutes');

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

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
        subDomain: { type: 'day', width: 15, height: 15, gutter: 4 },
        data: { source: heatmapData, x: 'date', y: 'total' },
        date: { start: new Date(new Date().setMonth(new Date().getMonth() - 2)) }, 
        range: 6, 
        scale: {
            color: {
                type: 'threshold',
                // Updated to aesthetic soft matcha greens
                range: ['#f4f2ee', '#c3d8c7', '#9ebc9f', '#7b9e87', '#567562'], 
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
