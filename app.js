class TimeTracker {
    constructor() {
        this.form = document.getElementById('timeTrackingForm');
        this.dayEntries = document.querySelectorAll('.day-entry');
        this.totalHoursElement = document.getElementById('totalHours');
        this.overtimeHoursElement = document.getElementById('overtimeHours');
        this.exportBtn = document.getElementById('exportPdfBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.calculateTotals();
    }

    attachEventListeners() {
        // Add event listeners for time inputs
        this.dayEntries.forEach(dayEntry => {
            const startTime = dayEntry.querySelector('.start-time');
            const endTime = dayEntry.querySelector('.end-time');
            const breakDuration = dayEntry.querySelector('.break-duration');

            [startTime, endTime, breakDuration].forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        this.calculateDailyHours(dayEntry);
                        this.calculateTotals();
                    });
                    input.addEventListener('blur', () => {
                        this.validateTimeInput(dayEntry);
                    });
                }
            });
        });

        // Export PDF button
        this.exportBtn.addEventListener('click', () => {
            this.exportToPDF();
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.resetForm();
        });

        // Form validation on submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportToPDF();
        });
    }

    calculateDailyHours(dayEntry) {
        const startTime = dayEntry.querySelector('.start-time').value;
        const endTime = dayEntry.querySelector('.end-time').value;
        const breakDuration = parseInt(dayEntry.querySelector('.break-duration').value) || 0;
        const dailyHoursInput = dayEntry.querySelector('.daily-hours');

        if (startTime && endTime) {
            const start = this.timeToMinutes(startTime);
            const end = this.timeToMinutes(endTime);
            
            if (end > start) {
                const workMinutes = (end - start) - breakDuration;
                if (workMinutes >= 0) {
                    dailyHoursInput.value = this.minutesToTimeString(workMinutes);
                    this.removeError(dayEntry);
                } else {
                    dailyHoursInput.value = '0:00';
                    this.showFieldError(dayEntry, 'Pausenzeit ist länger als die Arbeitszeit');
                }
            } else {
                dailyHoursInput.value = '0:00';
                this.showFieldError(dayEntry, 'Endzeit muss nach der Startzeit liegen');
            }
        } else {
            dailyHoursInput.value = '';
        }
    }

    calculateTotals() {
        let totalMinutes = 0;
        
        this.dayEntries.forEach(dayEntry => {
            const dailyHours = dayEntry.querySelector('.daily-hours').value;
            if (dailyHours) {
                totalMinutes += this.timeToMinutes(dailyHours);
            }
        });

        const totalTimeString = this.minutesToTimeString(totalMinutes);
        this.totalHoursElement.textContent = totalTimeString;

        // Calculate overtime (assuming 40 hours = 2400 minutes per week)
        const overtimeMinutes = totalMinutes - 2400;
        const overtimeString = overtimeMinutes > 0 ? 
            this.minutesToTimeString(overtimeMinutes) : '0:00';
        this.overtimeHoursElement.textContent = overtimeString;
        
        // Update overtime color
        if (overtimeMinutes > 0) {
            this.overtimeHoursElement.style.color = 'var(--color-warning)';
        } else {
            this.overtimeHoursElement.style.color = 'var(--color-primary)';
        }
    }

    timeToMinutes(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(num => parseInt(num));
        return (hours * 60) + (minutes || 0);
    }

    minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    validateTimeInput(dayEntry) {
        const startTime = dayEntry.querySelector('.start-time').value;
        const endTime = dayEntry.querySelector('.end-time').value;
        
        if (startTime && endTime) {
            const start = this.timeToMinutes(startTime);
            const end = this.timeToMinutes(endTime);
            
            if (end <= start) {
                this.showFieldError(dayEntry, 'Endzeit muss nach der Startzeit liegen');
                return false;
            }
        }
        
        this.removeError(dayEntry);
        return true;
    }

    validateForm() {
        let isValid = true;
        const requiredFields = ['employeeName', 'calendarWeek', 'costCenter'];
        
        // Check required fields
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showInputError(field, 'Dieses Feld ist erforderlich');
                isValid = false;
            } else {
                this.removeInputError(field);
            }
        });

        // Check if at least one day has working hours
        let hasWorkingHours = false;
        this.dayEntries.forEach(dayEntry => {
            const dailyHours = dayEntry.querySelector('.daily-hours').value;
            if (dailyHours && dailyHours !== '0:00') {
                hasWorkingHours = true;
            }
        });

        if (!hasWorkingHours) {
            this.showError('Bitte geben Sie für mindestens einen Tag Arbeitszeiten ein.');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(dayEntry, message) {
        const dayName = dayEntry.querySelector('h3').textContent;
        this.showError(`${dayName}: ${message}`);
        dayEntry.style.borderColor = 'var(--color-error)';
    }

    removeError(dayEntry) {
        dayEntry.style.borderColor = 'var(--color-border)';
    }

    showInputError(input, message) {
        input.classList.add('error');
        let errorDiv = input.parentNode.querySelector('.validation-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'validation-message';
            input.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    removeInputError(input) {
        input.classList.remove('error');
        const errorDiv = input.parentNode.querySelector('.validation-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
        
        setTimeout(() => {
            this.errorMessage.classList.add('hidden');
        }, 5000);
    }

    async exportToPDF() {
        if (!this.validateForm()) {
            return;
        }

        // Show loading state
        this.exportBtn.classList.add('btn--loading');
        this.exportBtn.textContent = 'Exportiere...';
        this.exportBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Get form data
            const employeeName = document.getElementById('employeeName').value;
            const calendarWeek = document.getElementById('calendarWeek').value;
            const costCenter = document.getElementById('costCenter').value;
            const currentDate = new Date().toLocaleDateString('de-DE');

            // PDF Header
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text('STUNDENERFASSUNG', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Erstellt am: ${currentDate}`, 20, 35);

            // Employee Information
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Mitarbeiter-Informationen:', 20, 50);
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.text(`Name: ${employeeName}`, 20, 60);
            doc.text(`Kalenderwoche: ${calendarWeek}`, 20, 70);
            doc.text(`Kostenstelle: ${costCenter}`, 20, 80);

            // Table Header
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Arbeitszeiterfassung:', 20, 100);

            // Table
            const tableData = [];
            const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
            
            this.dayEntries.forEach((dayEntry, index) => {
                const startTime = dayEntry.querySelector('.start-time').value || '-';
                const endTime = dayEntry.querySelector('.end-time').value || '-';
                const breakDuration = dayEntry.querySelector('.break-duration').value || '0';
                const dailyHours = dayEntry.querySelector('.daily-hours').value || '-';
                
                tableData.push([
                    days[index],
                    startTime,
                    endTime,
                    `${breakDuration} Min`,
                    dailyHours
                ]);
            });

            // Draw table
            let yPos = 110;
            const colWidths = [30, 25, 25, 25, 25];
            const headers = ['Tag', 'Start', 'Ende', 'Pause', 'Arbeitszeit'];

            // Table headers
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            let xPos = 20;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos, colWidths[i], 8);
                doc.text(header, xPos + 2, yPos + 5);
                xPos += colWidths[i];
            });

            // Table data
            doc.setFont(undefined, 'normal');
            yPos += 8;
            tableData.forEach(row => {
                xPos = 20;
                row.forEach((cell, i) => {
                    doc.rect(xPos, yPos, colWidths[i], 6);
                    doc.text(cell, xPos + 2, yPos + 4);
                    xPos += colWidths[i];
                });
                yPos += 6;
            });

            // Summary
            yPos += 15;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Zusammenfassung:', 20, yPos);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Gesamtstunden: ${this.totalHoursElement.textContent}`, 20, yPos + 10);
            doc.text(`Sollstunden: 40:00`, 20, yPos + 20);
            doc.text(`Überstunden: ${this.overtimeHoursElement.textContent}`, 20, yPos + 30);

            // Signature fields
            yPos += 50;
            doc.setFontSize(10);
            doc.text('Unterschrift Mitarbeiter:', 20, yPos);
            doc.text('Unterschrift Vorgesetzter:', 110, yPos);
            
            doc.line(20, yPos + 10, 80, yPos + 10);
            doc.line(110, yPos + 10, 170, yPos + 10);

            // Save PDF
            const filename = `Stundenerfassung_${employeeName.replace(/\s+/g, '_')}_${calendarWeek.replace(/\s+/g, '_')}.pdf`;
            doc.save(filename);

        } catch (error) {
            console.error('PDF Export Error:', error);
            this.showError('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.');
        } finally {
            // Reset button state
            this.exportBtn.classList.remove('btn--loading');
            this.exportBtn.textContent = 'PDF exportieren';
            this.exportBtn.disabled = false;
        }
    }

    resetForm() {
        if (confirm('Möchten Sie wirklich alle Eingaben zurücksetzen?')) {
            this.form.reset();
            
            // Reset break duration to default (30 minutes)
            this.dayEntries.forEach(dayEntry => {
                const breakInput = dayEntry.querySelector('.break-duration');
                const dailyHours = dayEntry.querySelector('.daily-hours');
                if (breakInput) breakInput.value = '30';
                if (dailyHours) dailyHours.value = '';
            });

            // Clear all errors
            this.dayEntries.forEach(dayEntry => {
                this.removeError(dayEntry);
            });

            // Remove input errors
            const errorInputs = document.querySelectorAll('.form-control.error');
            errorInputs.forEach(input => {
                this.removeInputError(input);
            });

            this.calculateTotals();
            this.errorMessage.classList.add('hidden');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TimeTracker();
});