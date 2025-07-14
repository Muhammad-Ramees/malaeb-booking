class CourtBookingSystem {
    constructor() {
        this.form = document.getElementById('bookingForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.availabilitySection = document.getElementById('availabilitySection');
        this.availabilityContent = document.getElementById('availabilityContent');
        this.bookedTimes = [];

        // Replace with your actual Apps Script URL
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbwjLEYW6FaxhgoO_99RGBFI4L8bMepb8LirAGCuBmIgdJ7C3KVr7Qpa0wAtskTnjj7o/exec';

        this.init();
    }

    init() {
        this.populateTimeDropdowns();
        this.setDefaultDate();
        this.bindEvents();
    }

    populateTimeDropdowns() {
        const startTimeSelect = document.getElementById('startTime');
        const endTimeSelect = document.getElementById('endTime');

        for (let hour = 0; hour < 24; hour++) {
            for (let minute of [0, 30]) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                const startOption = document.createElement('option');
                startOption.value = timeString;
                startOption.textContent = this.formatTime12Hour(timeString);
                startTimeSelect.appendChild(startOption);

                const endOption = document.createElement('option');
                endOption.value = timeString;
                endOption.textContent = this.formatTime12Hour(timeString);
                endTimeSelect.appendChild(endOption);
            }
        }
    }

    formatTime12Hour(time24) {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        startDateInput.value = today;
        endDateInput.value = today;
        startDateInput.min = today;
        endDateInput.min = today;
    }

    bindEvents() {
        this.form.addEventListener('input', () => this.validateForm());

        document.getElementById('startDate').addEventListener('change', (e) => {
            document.getElementById('endDate').value = e.target.value;
            this.fetchAvailability();
        });

        document.getElementById('court').addEventListener('change', () => this.fetchAvailability());
        document.getElementById('endDate').addEventListener('change', () => this.fetchAvailability());

        document.getElementById('startTime').addEventListener('change', () => this.validateTimes());
        document.getElementById('endTime').addEventListener('change', () => this.validateTimes());

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    validateForm() {
        const requiredFields = ['court', 'startDate', 'startTime', 'endDate', 'endTime', 'customerName', 'customerPhone', 'staff'];
        const allFilled = requiredFields.every(field => {
            const el = document.getElementById(field);
            return el && el.value.trim() !== '';
        });

        this.submitBtn.disabled = !allFilled;
    }

    validateTimes() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (startDate && endDate && startTime && endTime) {
            const startDateTime = new Date(`${startDate}T${startTime}`);
            const endDateTime = new Date(`${endDate}T${endTime}`);

            if (endDateTime <= startDateTime) {
                alert('End time must be after start time');
                document.getElementById('endTime').value = '';
                this.submitBtn.disabled = true;
            }
        }
    }

async fetchAvailability() {
    const court = document.getElementById('court').value;
    const date = document.getElementById('startDate').value;

    if (!court || !date) {
        this.availabilitySection.style.display = 'none';
        return;
    }

    this.availabilitySection.style.display = 'block';
    this.availabilityContent.innerHTML = '<div class="loading">Loading availability...</div>';

    try {
        // Use JSONP to bypass CORS
        const result = await this.makeJsonpRequest(`${this.scriptUrl}?court=${encodeURIComponent(court)}&date=${date}`);
        
        if (result.error) {
            throw new Error(result.error);
        }

        this.bookedTimes = result;
        this.displayAvailability(result);
        this.updateTimeDropdowns();
    } catch (error) {
        console.error('Fetch availability error:', error);
        this.availabilityContent.innerHTML = `<div class="no-bookings">Could not fetch availability: ${error.message}</div>`;
    }
}

// Add this new method to your CourtBookingSystem class
makeJsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'jsonp_callback_' + Date.now();
        
        // Create global callback function
        window[callbackName] = function(data) {
            resolve(data);
            document.head.removeChild(script);
            delete window[callbackName];
        };
        
        // Add callback parameter to URL
        const separator = url.includes('?') ? '&' : '?';
        script.src = `${url}${separator}callback=${callbackName}`;
        
        script.onerror = function() {
            reject(new Error('JSONP request failed'));
            document.head.removeChild(script);
            delete window[callbackName];
        };
        
        document.head.appendChild(script);
    });
}

// Replace the handleSubmit method with this version
async handleSubmit(e) {
    e.preventDefault();

    const formData = {
        court: document.getElementById('court').value,
        startDate: document.getElementById('startDate').value,
        startTime: document.getElementById('startTime').value,
        endDate: document.getElementById('endDate').value,
        endTime: document.getElementById('endTime').value,
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        staff: document.getElementById('staff').value
    };

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Booking...';

    try {
        // Use JSONP for booking as well
        const params = new URLSearchParams({
            action: 'book',
            ...formData
        });

        const result = await this.makeJsonpRequest(`${this.scriptUrl}?${params.toString()}`);

        if (result.success) {
            alert(result.message || '✅ Booking confirmed successfully!');
            this.form.reset();
            this.setDefaultDate();
            this.fetchAvailability();
        } else {
            alert(result.message || '❌ Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert(`❌ Booking failed: ${error.message}`);
    } finally {
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Book Court';
    }
}
}

document.addEventListener('DOMContentLoaded', () => new CourtBookingSystem());