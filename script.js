class CourtBookingSystem {
    constructor() {
        this.form = document.getElementById('bookingForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.availabilitySection = document.getElementById('availabilitySection');
        this.availabilityContent = document.getElementById('availabilityContent');
        this.bookedTimes = [];

        // Replace with your actual Apps Script URL
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbw0d8GSQewiq-8viqis75I_YqpL5EeZP92OR41MbjrFUSDGxzIc6mScTnNbS0oyTOpS/exec';

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
            const response = await fetch(`${this.scriptUrl}?court=${encodeURIComponent(court)}&date=${date}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

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

    displayAvailability(bookings) {
        if (bookings.length === 0) {
            this.availabilityContent.innerHTML = '<div class="no-bookings">✅ No bookings - Court is available all day!</div>';
            return;
        }

        const bookingElements = bookings.map(b => {
            const startTime = new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `<div class="booking-item">🟡 ${startTime} – ${endTime}</div>`;
        }).join('');

        this.availabilityContent.innerHTML = `<div style="margin-bottom:12px; font-weight: 500;">🔒 Booked Times:</div>${bookingElements}`;
    }

    updateTimeDropdowns() {
        const startTimeSelect = document.getElementById('startTime');
        const endTimeSelect = document.getElementById('endTime');

        // Reset options
        for (const option of startTimeSelect.options) {
            option.disabled = false;
        }
        for (const option of endTimeSelect.options) {
            option.disabled = false;
        }

        this.bookedTimes.forEach(booking => {
            const startTime = new Date(booking.start).toTimeString().slice(0, 5);
            const endTime = new Date(booking.end).toTimeString().slice(0, 5);

            for (const option of startTimeSelect.options) {
                if (option.value >= startTime && option.value < endTime) {
                    option.disabled = true;
                }
            }
            for (const option of endTimeSelect.options) {
                if (option.value > startTime && option.value <= endTime) {
                    option.disabled = true;
                }
            }
        });
    }

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
            // Use URL parameters instead of JSON body to avoid CORS preflight
            const params = new URLSearchParams();
            params.append('action', 'book');
            Object.keys(formData).forEach(key => {
                params.append(key, formData[key]);
            });

            const response = await fetch(`${this.scriptUrl}?${params.toString()}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

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