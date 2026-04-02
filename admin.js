// admin.js - Admin Dashboard Logic for Abotani Rentals

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, orderBy, Timestamp } from './firebase-config.js';

// DOM Elements
const dashboardBtn = document.getElementById('dashboardBtn');
const bookingsBtn = document.getElementById('bookingsBtn');
const slotsBtn = document.getElementById('slotsBtn');
const verifyBtn = document.getElementById('verifyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');

const dashboardView = document.getElementById('dashboardView');
const bookingsView = document.getElementById('bookingsView');
const slotsView = document.getElementById('slotsView');
const verifyView = document.getElementById('verifyView');
const settingsView = document.getElementById('settingsView');

// Password
const ADMIN_PASSWORD_HASH = btoa('Itanagar@raga'); // Simple encoding (upgrade to proper hash later)

// Check if admin is logged in
function isLoggedIn() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Show password modal if not logged in
function checkAuth() {
    if (!isLoggedIn()) {
        document.getElementById('passwordModal').style.display = 'flex';
        return false;
    }
    return true;
}

// Login handler
document.getElementById('submitPasswordBtn')?.addEventListener('click', () => {
    const password = document.getElementById('adminPassword').value;
    if (btoa(password) === ADMIN_PASSWORD_HASH) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('passwordModal').style.display = 'none';
        loadDashboard();
    } else {
        document.getElementById('loginError').innerText = 'Invalid password';
    }
});

// Enter key on password field
document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('submitPasswordBtn').click();
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
});

// Navigation
dashboardBtn.addEventListener('click', () => {
    showView('dashboard');
    loadDashboard();
});

bookingsBtn.addEventListener('click', () => {
    showView('bookings');
    loadAllBookings();
});

slotsBtn.addEventListener('click', () => {
    showView('slots');
});

verifyBtn.addEventListener('click', () => {
    showView('verify');
    loadPendingVerifications();
});

settingsBtn.addEventListener('click', () => {
    showView('settings');
    loadSettings();
});

function showView(view) {
    dashboardView.style.display = 'none';
    bookingsView.style.display = 'none';
    slotsView.style.display = 'none';
    verifyView.style.display = 'none';
    settingsView.style.display = 'none';
    
    if (view === 'dashboard') dashboardView.style.display = 'block';
    if (view === 'bookings') bookingsView.style.display = 'block';
    if (view === 'slots') slotsView.style.display = 'block';
    if (view === 'verify') verifyView.style.display = 'block';
    if (view === 'settings') settingsView.style.display = 'block';
    
    // Update active button
    [dashboardBtn, bookingsBtn, slotsBtn, verifyBtn, settingsBtn].forEach(btn => {
        btn.classList.remove('active');
    });
    if (view === 'dashboard') dashboardBtn.classList.add('active');
    if (view === 'bookings') bookingsBtn.classList.add('active');
    if (view === 'slots') slotsBtn.classList.add('active');
    if (view === 'verify') verifyBtn.classList.add('active');
    if (view === 'settings') settingsBtn.classList.add('active');
}

// Load Dashboard
async function loadDashboard() {
    if (!checkAuth()) return;
    
    try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const allBookings = [];
        bookingsSnapshot.forEach(doc => {
            allBookings.push({ id: doc.id, ...doc.data() });
        });
        
        const totalBookings = allBookings.length;
        const verifiedBookings = allBookings.filter(b => b.paymentStatus === 'verified');
        const totalRevenue = verifiedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const activeBookings = allBookings.filter(b => {
            return b.paymentStatus === 'verified' && b.endDate >= today;
        }).length;
        
        const completedBookings = allBookings.filter(b => {
            return b.paymentStatus === 'verified' && b.endDate < today;
        }).length;
        
        document.getElementById('totalRevenue').innerText = `₹${totalRevenue}`;
        document.getElementById('totalBookings').innerText = totalBookings;
        document.getElementById('activeBookings').innerText = activeBookings;
        document.getElementById('completedBookings').innerText = completedBookings;
        
        // Recent bookings (last 10)
        const recentBookings = allBookings.sort((a,b) => b.createdAt?.toMillis?.() || 0 - a.createdAt?.toMillis?.() || 0).slice(0, 10);
        const tbody = document.getElementById('recentTableBody');
        if (recentBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No bookings found</td></tr>';
        } else {
            tbody.innerHTML = recentBookings.map(b => `
                <tr>
                    <td>${b.bookingId || b.id}</td>
                    <td>${b.customerName || 'N/A'}</td>
                    <td>${b.phone || 'N/A'}</td>
                    <td>${b.startDate || 'N/A'} (${b.days || 0}d)</td>
                    <td>₹${b.totalAmount || 0}</td>
                    <td class="status-${b.paymentStatus === 'verified' ? 'verified' : 'pending'}">${b.paymentStatus || 'pending'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('recentTableBody').innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
    }
}

// Load All Bookings
async function loadAllBookings() {
    if (!checkAuth()) return;
    
    try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const allBookings = [];
        bookingsSnapshot.forEach(doc => {
            allBookings.push({ id: doc.id, ...doc.data() });
        });
        
        allBookings.sort((a,b) => b.createdAt?.toMillis?.() || 0 - a.createdAt?.toMillis?.() || 0);
        
        const tbody = document.getElementById('allBookingsTableBody');
        if (allBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No bookings found</td></tr>';
        } else {
            tbody.innerHTML = allBookings.map(b => `
                <tr>
                    <td>${b.bookingId || b.id}</td>
                    <td>${b.customerName || 'N/A'}</td>
                    <td>${b.phone || 'N/A'}</td>
                    <td>${b.aadhaar || 'N/A'}</td>
                    <td>${b.dlNumber || 'N/A'}</td>
                    <td>${b.startDate || 'N/A'}</td>
                    <td>${b.days || 0}</td>
                    <td>₹${b.totalAmount || 0}</td>
                    <td class="status-${b.paymentStatus === 'verified' ? 'verified' : 'pending'}">${b.paymentStatus || 'pending'}</td>
                    <td>${b.razorpayPaymentId || '-'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('allBookingsTableBody').innerHTML = '<tr><td colspan="10">Error loading data</td></tr>';
    }
}

// Slot Management
document.getElementById('checkSlotBtn')?.addEventListener('click', async () => {
    const date = document.getElementById('slotDate').value;
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    const slotRef = doc(db, 'slots', date);
    const slotDoc = await getDoc(slotRef);
    
    let availableSlots = 3;
    let bookings = [];
    if (slotDoc.exists()) {
        availableSlots = slotDoc.data().availableSlots;
        bookings = slotDoc.data().bookings || [];
    }
    
    document.getElementById('slotDetails').innerHTML = `
        <div class="stat-card">
            <h3>${date}</h3>
            <div class="value">${availableSlots} / 3 Available</div>
            <div style="margin-top: 15px;">
                <label>Set Available Slots (0-3):</label>
                <input type="number" id="setSlotsCount" min="0" max="3" value="${availableSlots}" style="width: 80px; margin: 0 10px;">
                <button id="updateSlotBtn">Update</button>
            </div>
            ${bookings.length > 0 ? `<div style="margin-top: 10px; font-size: 12px;">Bookings: ${bookings.join(', ')}</div>` : ''}
        </div>
    `;
    
    document.getElementById('updateSlotBtn')?.addEventListener('click', async () => {
        const newCount = parseInt(document.getElementById('setSlotsCount').value);
        if (isNaN(newCount) || newCount < 0 || newCount > 3) {
            alert('Please enter a number between 0 and 3');
            return;
        }
        
        await setDoc(slotRef, {
            date: date,
            totalSlots: 3,
            availableSlots: newCount,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        alert(`Slot updated to ${newCount} available scooters`);
        document.getElementById('checkSlotBtn').click();
    });
});

// Range update
document.getElementById('applyRangeBtn')?.addEventListener('click', async () => {
    const startDate = document.getElementById('rangeStart').value;
    const endDate = document.getElementById('rangeEnd').value;
    const slotsToSet = parseInt(document.getElementById('rangeSlots').value);
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    if (isNaN(slotsToSet) || slotsToSet < 0 || slotsToSet > 3) {
        alert('Slots must be between 0 and 3');
        return;
    }
    
    const dates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    let updated = 0;
    for (const date of dates) {
        const slotRef = doc(db, 'slots', date);
        await setDoc(slotRef, {
            date: date,
            totalSlots: 3,
            availableSlots: slotsToSet,
            updatedAt: Timestamp.now()
        }, { merge: true });
        updated++;
    }
    
    alert(`Updated ${updated} dates with ${slotsToSet} available slots each`);
});

// Load Pending Verifications
async function loadPendingVerifications() {
    if (!checkAuth()) return;
    
    try {
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const pendingBookings = [];
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.paymentStatus !== 'verified') {
                pendingBookings.push({ id: doc.id, ...data });
            }
        });
        
        const tbody = document.getElementById('pendingTableBody');
        if (pendingBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No pending verifications</td></tr>';
        } else {
            tbody.innerHTML = pendingBookings.map(b => `
                <tr>
                    <td>${b.bookingId || b.id}</td>
                    <td>${b.customerName || 'N/A'}</td>
                    <td>${b.phone || 'N/A'}</td>
                    <td>₹${b.totalAmount || 0}</td>
                    <td>${b.razorpayPaymentId || 'N/A'}</td>
                    <td><button class="verify-btn" data-id="${b.id}" data-booking="${b.bookingId}">✅ Verify Payment</button></td>
                </tr>
            `).join('');
        }
        
        document.querySelectorAll('.verify-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookingId = btn.getAttribute('data-id');
                await verifyPaymentManually(bookingId);
            });
        });
    } catch (error) {
        console.error('Error loading pending:', error);
        document.getElementById('pendingTableBody').innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
    }
}

async function verifyPaymentManually(bookingId) {
    if (!confirm('Confirm payment verification for this booking?')) return;
    
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
            paymentStatus: 'verified',
            verifiedAt: Timestamp.now()
        });
        
        // Update slots for the booking dates
        const bookingDoc = await getDoc(bookingRef);
        const booking = bookingDoc.data();
        
        if (booking.dates && booking.dates.length) {
            for (const date of booking.dates) {
                const slotRef = doc(db, 'slots', date);
                const slotDoc = await getDoc(slotRef);
                if (slotDoc.exists()) {
                    const currentSlots = slotDoc.data().availableSlots;
                    await updateDoc(slotRef, {
                        availableSlots: currentSlots - 1,
                        bookings: [...(slotDoc.data().bookings || []), booking.bookingId]
                    });
                }
            }
        }
        
        alert('Payment verified and booking confirmed!');
        loadPendingVerifications();
        loadDashboard();
    } catch (error) {
        console.error('Error verifying payment:', error);
        alert('Error verifying payment');
    }
}

// Settings
async function loadSettings() {
    document.getElementById('pricePerDay').value = localStorage.getItem('pricePerDay') || ’699';
    document.getElementById('supportPhone').value = '8798394440';
}

document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass !== confirmPass) {
        alert('Passwords do not match');
        return;
    }
    
    if (newPass.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    // Update the hash in session and store for next login
    sessionStorage.setItem('adminPassword', btoa(newPass));
    alert('Password changed for this session. To make permanent, update ADMIN_PASSWORD_HASH in admin.js');
});

document.getElementById('updatePriceBtn')?.addEventListener('click', () => {
    const price = parseInt(document.getElementById('pricePerDay').value);
    if (isNaN(price) || price < 0) {
        alert('Invalid price');
        return;
    }
    localStorage.setItem('pricePerDay', price);
    alert(`Price updated to ₹${price} per day`);
});

document.getElementById('updatePhoneBtn')?.addEventListener('click', () => {
    const phone = document.getElementById('supportPhone').value;
    if (!/^\d{10}$/.test(phone)) {
        alert('Enter valid 10-digit phone number');
        return;
    }
    localStorage.setItem('supportPhone', phone);
    alert(`Support phone updated to ${phone}`);
});

// Initialize
if (isLoggedIn()) {
    loadDashboard();
}

// Auto-refresh every 30 seconds
setInterval(() => {
    if (isLoggedIn() && dashboardView.style.display !== 'none') {
        loadDashboard();
    }
}, 30000);
