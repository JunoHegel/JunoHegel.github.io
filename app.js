// --- 1. Supabase Setup ---
const { createClient } = supabase;
const supabaseUrl = 'https://hxzcdicsrymdmxmonsgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4emNkaWNzcnltZG14bW9uc2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTU1NzksImV4cCI6MjA4NzMzMTU3OX0.CRq1y0fp0D9TWayM2v2eVMvoK4BtGVK0ZF6BSJ3rAkM';
const db = createClient(supabaseUrl, supabaseKey);

// --- 2. Timer Variables ---
let timeLeft = 50 * 60; // 50 minutes in seconds
let timerId = null;
const display = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

// --- 3. Timer Functions ---
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    // Formats the text to always show two digits (e.g., 09:05)
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerId !== null) return; // Prevents multiple timers from running at once
    
    timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerId = null;
            saveSession(50); // Log the full 50 minutes
            alert("Focus session complete! Data logged to Supabase.");
            timeLeft = 50 * 60; // Reset timer for the next block
            updateDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    
    // Calculate how many actual minutes were studied if you stopped early
    const minutesStudied = 50 - Math.floor(timeLeft / 60);
    
    if (minutesStudied > 0) {
        saveSession(minutesStudied);
        alert(`Session stopped early. Logged ${minutesStudied} minutes.`);
    }
    
    timeLeft = 50 * 60; // Reset timer
    updateDisplay();
}

// --- 4. Database Function ---
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
        console.log("Session logged successfully!", data);
    }
}

// --- 5. Event Listeners ---
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);

// Initialize the timer display immediately on load
updateDisplay();
