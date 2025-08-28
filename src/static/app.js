// Global state
let authToken = localStorage.getItem('authToken');
let isAuthenticated = false;
let currentTeacher = null;

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadActivities();
    setupEventListeners();
});

async function checkAuthStatus() {
    if (authToken) {
        try {
            const response = await fetch('/verify-auth', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    isAuthenticated = true;
                    currentTeacher = data.teacher;
                    updateAuthUI();
                    return;
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
    
    // Clear invalid token
    localStorage.removeItem('authToken');
    authToken = null;
    isAuthenticated = false;
    updateAuthUI();
}

function updateAuthUI() {
    const loginContainer = document.getElementById('login-container');
    const authStatus = document.getElementById('auth-status');
    const teacherName = document.getElementById('teacher-name');
    const authWarning = document.getElementById('auth-warning');
    const signupBtn = document.getElementById('signup-btn');
    const unregisterBtn = document.getElementById('unregister-btn');
    
    if (isAuthenticated) {
        loginContainer.classList.add('hidden');
        authStatus.classList.remove('hidden');
        teacherName.textContent = `Welcome, ${currentTeacher}`;
        authWarning.classList.add('hidden');
        signupBtn.disabled = false;
        unregisterBtn.disabled = false;
    } else {
        loginContainer.classList.remove('hidden');
        authStatus.classList.add('hidden');
        authWarning.classList.remove('hidden');
        signupBtn.disabled = true;
        unregisterBtn.disabled = true;
    }
}

function setupEventListeners() {
    // Login button
    document.getElementById('login-btn').addEventListener('click', showLoginModal);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', hideLoginModal);
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('login-modal');
        if (event.target === modal) {
            hideLoginModal();
        }
    });
    
    // Signup form
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
    
    // Unregister button
    document.getElementById('unregister-btn').addEventListener('click', handleUnregister);
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
}

function hideLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('login-form').reset();
    document.getElementById('login-message').classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('login-message');
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            
            await checkAuthStatus();
            hideLoginModal();
            showMessage('Successfully logged in!', 'success');
        } else {
            const errorData = await response.json();
            messageDiv.textContent = errorData.detail || 'Login failed';
            messageDiv.className = 'error';
            messageDiv.classList.remove('hidden');
        }
    } catch (error) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    isAuthenticated = false;
    currentTeacher = null;
    updateAuthUI();
    showMessage('Logged out successfully', 'success');
}

async function loadActivities() {
    try {
        const response = await fetch('/activities');
        const activities = await response.json();
        displayActivities(activities);
        populateActivitySelect(activities);
    } catch (error) {
        console.error('Error loading activities:', error);
        showMessage('Error loading activities', 'error');
    }
}

function displayActivities(activities) {
    const activitiesList = document.getElementById('activities-list');
    activitiesList.innerHTML = '';

    Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement('div');
        activityCard.className = 'activity-card';

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsList = details.participants.length > 0 
            ? `<p><strong>Participants:</strong> ${details.participants.join(', ')}</p>`
            : '<p><em>No participants yet</em></p>';

        activityCard.innerHTML = `
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Capacity:</strong> ${details.participants.length}/${details.max_participants} (${spotsLeft} spots left)</p>
            ${participantsList}
        `;

        activitiesList.appendChild(activityCard);
    });
}

function populateActivitySelect(activities) {
    const activitySelect = document.getElementById('activity');
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.keys(activities).forEach(activityName => {
        const option = document.createElement('option');
        option.value = activityName;
        option.textContent = activityName;
        activitySelect.appendChild(option);
    });
}

async function handleSignup(event) {
    event.preventDefault();
    
    if (!isAuthenticated) {
        showMessage('Please log in as a teacher to register students', 'error');
        return;
    }

    const email = document.getElementById('email').value;
    const activityName = document.getElementById('activity').value;

    if (!email || !activityName) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`/activities/${activityName}/signup?email=${encodeURIComponent(email)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            showMessage(data.message, 'success');
            document.getElementById('signup-form').reset();
            loadActivities(); // Refresh the activities list
        } else {
            const errorData = await response.json();
            showMessage(errorData.detail || 'Signup failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleUnregister(event) {
    event.preventDefault();
    
    if (!isAuthenticated) {
        showMessage('Please log in as a teacher to unregister students', 'error');
        return;
    }

    const email = document.getElementById('email').value;
    const activityName = document.getElementById('activity').value;

    if (!email || !activityName) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`/activities/${activityName}/unregister?email=${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            showMessage(data.message, 'success');
            document.getElementById('signup-form').reset();
            loadActivities(); // Refresh the activities list
        } else {
            const errorData = await response.json();
            showMessage(errorData.detail || 'Unregistration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}
