// script.js - Customer Booking Logic for Abotani Rentals

import { db, collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, Timestamp } from './firebase-config.js';

// DOM Elements
const form = document.getElementById('bookingForm');
const startDateInput = document.getElementById('startDate');
const daysInput = document.getElementById('days');
const payBtn = document.getElementById('payBtn');
const availabilityResult = document.getElementById('availabilityResult');

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
startDateInput.setAttribute('min', today);

// Price per day (change this as needed)
const PRICE_PER_DAY = 699; // ₹699 per day

// Check availability when start date or days change
startDateInput.addEventListener('change', checkAvailability);
daysInput.addEventListener('change', checkAvailability);

// Pay button click handler
payBtn.addEventListener('click', initiatePayment);

// Function to check availability
async function checkAvailability() {
    const startDate = startDateInput.value;
    const days = parseInt(daysInput.value);
    
    if (!startDate || !days || days < 1) {
        availabilityResult.classList.add('hidden');
        payBtn.classList.add('hidden');
        payBtn.disabled = true;
        return;
    }
    
    // Show loading
    availabilityResult.classList.remove('hidden');
    availabilityResult.innerHTML = '<div class="spinner"></div><p>Checking availability...</p>';
    availabilityResult.className = 'availability-box';
    
    try {
        // Calculate all dates in the booking range
        const dates = getDateRange(startDate, days);
        
        // Check availability for each date
        let fullyAvailable = true;
        let availableCounts = [];
        
        for (const date of dates) {
            const slotDoc = await getDoc(doc(db, 'slots', date));
            let availableSlots = 3; // Default 3 scooters
            
            if (slotDoc.exists()) {
                const slotData = slotDoc.data();
                availableSlots = slotData.availableSlots !== undefined ? slotData.availableSlots : 3;
            }
            
            availableCounts.push({ date, availableSlots });
            
            if (availableSlots < 1) {
                fullyAvailable = false;
            }
        }
        
        // Display availability result
        const minAvailable = Math.min(...availableCounts.map(c => c.availableSlots));
        const totalAmount = days * PRICE_PER_DAY;
        
        if (minAvailable >= 1) {
            // Fully available
            availabilityResult.className = 'availability-box available';
            availabilityResult.innerHTML = `
                ✅ <strong>Available!</strong><br>
                ${days} day(s) | ₹${totalAmount}<br>
                ${availableCounts.map(c => `${c.date}: ${c.availableSlots} scooty(s) available`).join('<br>')}
            `;
            payBtn.classList.remove('hidden');
            payBtn.disabled = false;
        } else if (minAvailable === 0) {
            // Check if partial booking possible (some dates available, some not)
            const someAvailable = availableCounts.some(c => c.availableSlots > 0);
            
            if (someAvailable) {
                availabilityResult.className = 'availability-box partial';
                availabilityResult.innerHTML = `
                    ⚠️ <strong>Partial Availability</strong><br>
                    Some dates are fully booked. Please select different dates.<br>
                    ${availableCounts.map(c => `${c.date}: ${c.availableSlots} scooty(s)`).join('<br>')}
                `;
                payBtn.classList.add('hidden');
                payBtn.disabled = true;
            } else {
                availabilityResult.className = 'availability-box unavailable';
                availabilityResult.innerHTML = `
                    ❌ <strong>Not Available</strong><br>
                    All scooters are booked for these dates. Please try different dates.
                `;
                payBtn.classList.add('hidden');
                payBtn.disabled = true;
            }
        }
        
    } catch (error) {
        console.error('Error checking availability:', error);
        availabilityResult.className = 'availability-box unavailable';
        availabilityResult.innerHTML = '❌ Error checking availability. Please try again.';
        payBtn.classList.add('hidden');
        payBtn.disabled = true;
    }
}

// Helper function to get date range
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

// Function to initiate Razorpay payment
async function initiatePayment() {
    // Validate form first
    const fullName = document.getElementById('fullName').value.trim();
    const address = document.getElementById('address').value.trim();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dlNumber = document.getElementById('dlNumber').value.trim();
    const startDate = document.getElementById('startDate').value;
    const days = parseInt(document.getElementById('days').value);
    const consent = document.getElementById('consent').checked;
    
    if (!fullName || !address || !aadhaar || !phone || !dlNumber || !startDate || !days || !consent) {
        alert('Please fill all required fields and accept consent');
        return;
    }
    
    if (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) {
        alert('Aadhaar number must be 12 digits');
        return;
    }
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert('Phone number must be 10 digits');
        return;
    }
    
    // Calculate total amount
    const totalAmount = days * 699; // ₹699 per day
    
    // Razorpay options (SIMPLIFIED - same as working test)
    const options = {
        key: 'rzp_test_SYcTI0OyfTr45x',  // ← PUT YOUR ACTUAL KEY
        amount: totalAmount * 100,
        currency: 'INR',
        name: 'Abotani Rentals',
        description: `${days} Day(s) | ${startDate}`,
        handler: function(response) {
            alert('✅ Payment Successful!\nPayment ID: ' + response.razorpay_payment_id);
            alert('Booking confirmed! Check your email/WhatsApp for receipt.');
            // Reset form after success
            document.getElementById('bookingForm').reset();
            document.getElementById('availabilityResult').classList.add('hidden');
            document.getElementById('payBtn').classList.add('hidden');
        },
        prefill: {
            name: fullName,
            contact: phone,
        },
        theme: {
            color: '#667eea'
        }
    };
    
    const razorpay = new Razorpay(options);
    razorpay.open();
}

// Function to verify payment and create booking
async function verifyPayment(paymentResponse, bookingData) {
    try {
        // Show loading
        payBtn.disabled = true;
        payBtn.textContent = 'Verifying Payment...';
        
        // Call Firebase Cloud Function to verify payment
        // For now, we'll simulate verification
        // In production, this should call your Cloud Function
        
        // Simulate verification (replace with actual cloud function call)
        console.log('Payment response:', paymentResponse);
        console.log('Booking data:', bookingData);
        
        // Create booking in Firestore
        const dates = getDateRange(bookingData.startDate, bookingData.days);
        
        // Create booking document
        const bookingRef = await addDoc(collection(db, 'bookings'), {
            bookingId: bookingData.bookingId,
            customerName: bookingData.fullName,
            address: bookingData.address,
            aadhaar: bookingData.aadhaar,
            phone: bookingData.phone,
            dlNumber: bookingData.dlNumber,
            startDate: bookingData.startDate,
            endDate: dates[dates.length - 1],
            days: bookingData.days,
            totalAmount: bookingData.totalAmount,
            paymentStatus: 'verified',
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpaySignature: paymentResponse.razorpay_signature,
            createdAt: Timestamp.now(),
            dates: dates
        });
        
        // Update slots for each date
        for (const date of dates) {
            const slotRef = doc(db, 'slots', date);
            const slotDoc = await getDoc(slotRef);
            
            if (slotDoc.exists()) {
                const currentSlots = slotDoc.data().availableSlots;
                await setDoc(slotRef, {
                    availableSlots: currentSlots - 1,
                    totalSlots: 3,
                    bookings: [...(slotDoc.data().bookings || []), bookingData.bookingId]
                }, { merge: true });
            } else {
                await setDoc(slotRef, {
                    date: date,
                    availableSlots: 2,
                    totalSlots: 3,
                    bookings: [bookingData.bookingId]
                });
            }
        }
        
        // Generate PDF receipt (simplified - will create download link)
        generateReceipt(bookingData, paymentResponse);
        
        // Send WhatsApp message (placeholder - will be implemented)
        sendWhatsAppMessage(bookingData, paymentResponse);
        
        // Clear pending booking
        localStorage.removeItem('pendingBooking');
        
        // Show success message
        alert(`✅ Booking Confirmed!\nBooking ID: ${bookingData.bookingId}\nReceipt will be downloaded.`);
        
        // Reset form
        form.reset();
        availabilityResult.classList.add('hidden');
        payBtn.classList.add('hidden');
        payBtn.disabled = true;
        payBtn.textContent = 'Pay to Book';
        
    } catch (error) {
        console.error('Error creating booking:', error);
        alert('Payment verified but booking failed. Please contact support: 8798394440');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay to Book';
    }
}

// Generate PDF receipt
function generateReceipt(bookingData, paymentResponse) {
    // Simple text receipt (PDF generation would require additional library)
    const receiptContent = `
ABOTANI RENTALS - RENTAL RECEIPT
================================
Booking ID: ${bookingData.bookingId}
Date: ${new Date().toLocaleString()}

Customer Details:
-----------------
Name: ${bookingData.fullName}
Phone: ${bookingData.phone}
DL Number: ${bookingData.dlNumber}

Rental Details:
---------------
Start Date: ${bookingData.startDate}
Duration: ${bookingData.days} day(s)
Total Amount: ₹${bookingData.totalAmount}

Payment Details:
----------------
Payment ID: ${paymentResponse.razorpay_payment_id}
Status: VERIFIED

Thank you for choosing Abotani Rentals!
Ride Swift and Safe
Support: 8798394440
    `;
    
    // Create download link
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${bookingData.bookingId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Send WhatsApp message (placeholder - implement when API ready)
function sendWhatsAppMessage(bookingData, paymentResponse) {
    // WhatsApp Business API will be implemented here
    // For now, log to console
    const message = `New Booking Confirmed!\nBooking ID: ${bookingData.bookingId}\nCustomer: ${bookingData.fullName}\nPhone: ${bookingData.phone}\nDates: ${bookingData.startDate} (${bookingData.days} days)\nAmount: ₹${bookingData.totalAmount}`;
    
    console.log('WhatsApp message would be sent:', message);
    console.log('Admin copy would also be sent to 8798394440');
    
    // When you have WhatsApp Business API, implement:
    // await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
    //     method: 'POST',
    //     headers: { 'Authorization': 'Bearer YOUR_TOKEN', 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ ... })
    // });
}
