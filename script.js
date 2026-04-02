// script.js - Abotani Rentals Customer Side
import { db, collection, addDoc, doc, getDoc, setDoc, Timestamp } from './firebase-config.js';

const PRICE_PER_DAY = 749;

// DOM Elements
const startDateInput = document.getElementById('startDate');
const daysInput = document.getElementById('days');
const payBtn = document.getElementById('payBtn');
const availabilityResult = document.getElementById('availabilityResult');

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
startDateInput.setAttribute('min', today);

// Check availability when date changes
startDateInput.addEventListener('change', checkAvailability);
daysInput.addEventListener('change', checkAvailability);

async function checkAvailability() {
    const startDate = startDateInput.value;
    const days = parseInt(daysInput.value);
    
    if (!startDate || days < 1) {
        availabilityResult.classList.add('hidden');
        payBtn.classList.add('hidden');
        return;
    }
    
    availabilityResult.classList.remove('hidden');
    availabilityResult.innerHTML = '<div class="spinner"></div><p>Checking availability...</p>';
    
    try {
        const dates = getDateRange(startDate, days);
        let allAvailable = true;
        let availableCount = 3;
        
        for (const date of dates) {
            const slotDoc = await getDoc(doc(db, 'slots', date));
            if (slotDoc.exists()) {
                const available = slotDoc.data().availableSlots || 0;
                availableCount = Math.min(availableCount, available);
                if (available < 1) allAvailable = false;
            }
        }
        
        const totalAmount = days * PRICE_PER_DAY;
        
        if (allAvailable && availableCount > 0) {
            availabilityResult.className = 'availability-box available';
            availabilityResult.innerHTML = `✅ Available! ${days} day(s) | ₹${totalAmount}<br>${availableCount} scooters available for all dates`;
            payBtn.classList.remove('hidden');
            payBtn.disabled = false;
            payBtn.onclick = () => initiatePayment(dates, totalAmount);
        } else {
            availabilityResult.className = 'availability-box unavailable';
            availabilityResult.innerHTML = `❌ Not available for selected dates. Please choose different dates.`;
            payBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        availabilityResult.innerHTML = '❌ Error checking availability';
    }
}

function getDateRange(startDate, days) {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

async function initiatePayment(dates, totalAmount) {
    // Get form data
    const fullName = document.getElementById('fullName').value.trim();
    const address = document.getElementById('address').value.trim();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dlNumber = document.getElementById('dlNumber').value.trim();
    const startDate = startDateInput.value;
    const days = parseInt(daysInput.value);
    const consent = document.getElementById('consent').checked;
    
    // Validate
    if (!fullName || !address || !aadhaar || !phone || !dlNumber || !startDate || !consent) {
        alert('Please fill all fields and accept consent');
        return;
    }
    if (aadhaar.length !== 12 || isNaN(aadhaar)) {
        alert('Aadhaar must be 12 digits');
        return;
    }
    if (phone.length !== 10 || isNaN(phone)) {
        alert('Phone must be 10 digits');
        return;
    }
    
    // Generate unique booking ID
    const bookingId = 'ABT' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Store booking data temporarily
    const bookingData = {
        bookingId: bookingId,
        customerName: fullName,
        address: address,
        aadhaar: aadhaar,
        phone: phone,
        dlNumber: dlNumber,
        startDate: startDate,
        days: days,
        totalAmount: totalAmount,
        dates: dates,
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
    };
    
    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
    
    // Razorpay options
    const options = {
        key: 'rzp_test_SYcTI0OyfTr45x', // ← REPLACE WITH YOUR KEY
        amount: totalAmount * 100,
        currency: 'INR',
        name: 'Abotani Rentals',
        description: `${days} Day(s) | ${startDate}`,
        handler: async function(response) {
            await verifyAndSaveBooking(bookingData, response);
        },
        prefill: {
            name: fullName,
            contact: phone
        },
        theme: { color: '#667eea' }
    };
    
    const razorpay = new Razorpay(options);
    razorpay.open();
}

async function verifyAndSaveBooking(bookingData, paymentResponse) {
    try {
        payBtn.disabled = true;
        payBtn.textContent = 'Verifying...';
        
        // Add payment details to booking
        bookingData.razorpayPaymentId = paymentResponse.razorpay_payment_id;
        bookingData.paymentStatus = 'verified';
        bookingData.verifiedAt = Timestamp.now();
        
        // Save to Firebase
        const docRef = await addDoc(collection(db, 'bookings'), bookingData);
        console.log('Booking saved with ID:', docRef.id);
        
        // Update slots for each date
        for (const date of bookingData.dates) {
            const slotRef = doc(db, 'slots', date);
            const slotDoc = await getDoc(slotRef);
            
            if (slotDoc.exists()) {
                const currentSlots = slotDoc.data().availableSlots || 3;
                await setDoc(slotRef, {
                    availableSlots: currentSlots - 1,
                    totalSlots: 3,
                    lastUpdated: Timestamp.now()
                }, { merge: true });
            } else {
                await setDoc(slotRef, {
                    date: date,
                    availableSlots: 2,
                    totalSlots: 3,
                    lastUpdated: Timestamp.now()
                });
            }
        }
        
        // Generate receipt
        generateReceipt(bookingData);
        
        // Send WhatsApp (placeholder)
        sendWhatsAppMessage(bookingData);
        
        alert(`✅ Booking Confirmed!\nID: ${bookingData.bookingId}\nReceipt downloaded.`);
        
        // Reset form
        document.getElementById('bookingForm').reset();
        availabilityResult.classList.add('hidden');
        payBtn.classList.add('hidden');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay to Book';
        
        sessionStorage.removeItem('pendingBooking');
        
    } catch (error) {
        console.error('Save error:', error);
        alert('Payment successful but booking save failed. Please contact support: 8798394440');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay to Book';
    }
}

function generateReceipt(booking) {
    const receipt = `
ABOTANI RENTALS - RECEIPT
========================
Booking ID: ${booking.bookingId}
Date: ${new Date().toLocaleString()}

Customer: ${booking.customerName}
Phone: ${booking.phone}
DL: ${booking.dlNumber}

Rental: ${booking.startDate} (${booking.days} days)
Amount: ₹${booking.totalAmount}

Payment ID: ${booking.razorpayPaymentId}
Status: VERIFIED

Thank you! Ride Swift & Safe
Support: 8798394440
    `;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${booking.bookingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function sendWhatsAppMessage(booking) {
    const message = `New Booking! ${booking.customerName} booked ${booking.days} days from ${booking.startDate}. Amount: ₹${booking.totalAmount}`;
    console.log('WhatsApp:', message);
    // WhatsApp API will be added when you have credentials
}
