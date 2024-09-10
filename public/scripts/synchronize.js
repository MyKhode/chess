require("dotenv").config();
const { createClient } = supabase;
const _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function validateUser(userId, currentMoney) {
console.log(process.env.SUPABASE_URL);

    const { data, error } = await _supabase
        .from('cash')
        .select('id, money')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching data:', error);
        alert('Error fetching data. Please try again.');
        return false;
    }

    if (data.money !== currentMoney) {
        alert('Current money does not match with the database record.');
        return false;
    }

    // Save user session in localStorage or cookie
    localStorage.setItem('userId', userId);
    localStorage.setItem('currentMoney', currentMoney);
    return true;
}


async function verifyUser() {
    const userId = document.getElementById('userId').value;
    const currentMoney = parseFloat(document.getElementById('currentMoney').value);

    if (await validateUser(userId, currentMoney)) {
        document.getElementById('verificationForm').style.display = 'none';
        document.getElementById('gameSetup').style.display = 'block';
    }
}

function checkUserSession() {
    const userId = localStorage.getItem('userId');
    const currentMoney = localStorage.getItem('currentMoney');

    if (userId && currentMoney) {
        document.getElementById('verificationForm').style.display = 'none';
        document.getElementById('gameSetup').style.display = 'block';
    }
}

function removeSession() {
    localStorage.removeItem('userId');
    localStorage.removeItem('currentMoney');
    document.getElementById('verificationForm').style.display = 'block';
    document.getElementById('gameSetup').style.display = 'none';
}

// Check if user is already verified on page load
window.onload = checkUserSession;
