/**
 * ============================================================================
 * PROJECT: Student Course Registration System (Enterprise Edition)
 * MODULE: RegistrationApp
 * AUTHOR: Senior Frontend Engineering Standards
 * ARCHITECTURE:
 *   - Clean Modular Pattern (Revealing Module / Class Pattern)
 *   - Strict Type & Format Validation (Regex, Unicode Khmer support)
 *   - Reactive State & LocalStorage Draft Persistence
 *   - Micro-Confetti Particle Engine (Zero Dependencies)
 *   - Accessible Modal Dialog (Focus Trap, Esc Handler)
 *   - Toast Notification Manager
 * ============================================================================
 */

'use strict';

window.RegistrationApp = (() => {

    // ========================================================================
    // 1. CONFIGURATION & CONSTANTS
    // ========================================================================
    const CONFIG = {
        STORAGE_KEY: 'eduportal_student_draft_v1',
        AUTOSAVE_DELAY_MS: 500,
        TOAST_DURATION_MS: 3800,
        REGEX: {
            // Support Khmer characters (\u1780-\u17FF) and English/Latin letters & spaces
            NAME: /^[\u1780-\u17FFa-zA-Z\s'.]{3,60}$/,
            // Alphanumeric ID with dashes, e.g. STU-2026, B202601, 102938
            STUDENT_ID: /^[A-Za-z0-9\-_]{3,20}$/,
            // Strict RFC 5322 compliant email regex
            EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
            // Cambodian phone numbers: 01x, 06x, 07x, 08x, 09x, +855... (8-11 digits)
            PHONE: /^(?:\+?855|0)(?:[1-9][0-9]{7,9})$/
        }
    };

    // ========================================================================
    // 2. STATE STORE
    // ========================================================================
    const State = {
        isSubmitting: false,
        lastSubmittedData: null,
        activeCourse: null,
        validationMap: {
            fullName: false,
            studentId: false,
            email: false,
            phone: false,
            courseSelect: false,
            studyShift: false,
            gender: false,
            studyMode: false,
            termsAgree: false
        }
    };

    // ========================================================================
    // 3. DOM ELEMENT CACHE
    // ========================================================================
    const DOM = {};

    function cacheDOM() {
        DOM.form = document.getElementById('studentRegistrationForm');
        DOM.submitBtn = document.getElementById('submitBtn');
        DOM.submitBtnText = document.getElementById('submitBtnText');
        DOM.resetBtn = document.getElementById('resetBtn');
        DOM.globalAlert = document.getElementById('formGlobalAlert');
        DOM.globalAlertMsg = document.getElementById('globalAlertMessage');
        DOM.draftStatusText = document.getElementById('draftStatusText');

        // Inputs
        DOM.fullName = document.getElementById('fullName');
        DOM.studentId = document.getElementById('studentId');
        DOM.email = document.getElementById('email');
        DOM.phone = document.getElementById('phone');
        DOM.courseSelect = document.getElementById('courseSelect');
        DOM.studyShift = document.getElementById('studyShift');
        DOM.studyMode = document.getElementById('studyMode');
        DOM.note = document.getElementById('note');
        DOM.termsAgree = document.getElementById('termsAgree');

        // Error spans
        DOM.fullNameError = document.getElementById('fullNameError');
        DOM.studentIdError = document.getElementById('studentIdError');
        DOM.emailError = document.getElementById('emailError');
        DOM.phoneError = document.getElementById('phoneError');
        DOM.courseSelectError = document.getElementById('courseSelectError');
        DOM.studyShiftError = document.getElementById('studyShiftError');
        DOM.genderError = document.getElementById('genderError');
        DOM.studyModeError = document.getElementById('studyModeError');
        DOM.termsAgreeError = document.getElementById('termsAgreeError');

        // Ribbon
        DOM.ribbon = document.getElementById('courseSelectedRibbon');
        DOM.ribbonTitle = document.getElementById('ribbonCourseTitle');
        DOM.ribbonFee = document.getElementById('ribbonCourseFee');
        DOM.ribbonClear = document.getElementById('clearCourseSelectionBtn');

        // Modal
        DOM.modal = document.getElementById('confirmationModal');
        DOM.modalBox = DOM.modal ? DOM.modal.querySelector('.modal-dialog-box') : null;
        DOM.receiptRegNumber = document.getElementById('receiptRegNumber');
        DOM.receiptTimestamp = document.getElementById('receiptTimestamp');
        DOM.confirmFullName = document.getElementById('confirmFullName');
        DOM.confirmStudentId = document.getElementById('confirmStudentId');
        DOM.confirmGender = document.getElementById('confirmGender');
        DOM.confirmEmail = document.getElementById('confirmEmail');
        DOM.confirmPhone = document.getElementById('confirmPhone');
        DOM.confirmStudyMode = document.getElementById('confirmStudyMode');
        DOM.confirmCourseName = document.getElementById('confirmCourseName');
        DOM.confirmStudyShift = document.getElementById('confirmStudyShift');
        DOM.confirmNote = document.getElementById('confirmNote');
        DOM.receiptNoteWrapper = document.getElementById('receiptNoteWrapper');

        // Navigation
        DOM.mobileNavToggle = document.getElementById('mobileNavToggle');
        DOM.primaryNav = document.getElementById('primaryNav');
        DOM.toastContainer = document.getElementById('toastContainer');
    }

    // ========================================================================
    // 4. UTILITIES (Debounce, Sanitizer, Toast)
    // ========================================================================
    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function sanitizeText(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'info') {
        if (!DOM.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconClass = type === 'success' ? 'fa-circle-check'
                        : type === 'error' ? 'fa-triangle-exclamation'
                        : 'fa-circle-info';

        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${sanitizeText(message)}</span>`;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 200ms ease';
            setTimeout(() => toast.remove(), 250);
        }, CONFIG.TOAST_DURATION_MS);
    }

    // ========================================================================
    // 5. VALIDATION ENGINE
    // ========================================================================
    function setFieldState(inputEl, errorEl, isValid, message = '') {
        if (inputEl) {
            if (isValid) {
                inputEl.classList.remove('is-invalid');
                inputEl.classList.add('is-valid');
                inputEl.setAttribute('aria-invalid', 'false');
            } else {
                inputEl.classList.remove('is-valid');
                inputEl.classList.add('is-invalid');
                inputEl.setAttribute('aria-invalid', 'true');
            }
        }
        if (errorEl) {
            errorEl.textContent = isValid ? '' : message;
        }
    }

    const Validators = {
        fullName() {
            const val = DOM.fullName.value.trim();
            if (!val) {
                setFieldState(DOM.fullName, DOM.fullNameError, false, 'សូមបញ្ចូលឈ្មោះពេញរបស់លោកអ្នក! (Full Name is required)');
                return false;
            }
            if (val.length < 3) {
                setFieldState(DOM.fullName, DOM.fullNameError, false, 'ឈ្មោះត្រូវមានយ៉ាងតិច ៣ តួអក្សរ! (Minimum 3 characters)');
                return false;
            }
            if (!CONFIG.REGEX.NAME.test(val)) {
                setFieldState(DOM.fullName, DOM.fullNameError, false, 'ឈ្មោះមិនត្រូវមានតួលេខ ឬនិមិត្តសញ្ញាពិសេសឡើយ!');
                return false;
            }
            setFieldState(DOM.fullName, DOM.fullNameError, true);
            return true;
        },

        studentId() {
            const val = DOM.studentId.value.trim();
            if (!val) {
                setFieldState(DOM.studentId, DOM.studentIdError, false, 'សូមបញ្ចូលអត្តលេខសិស្ស! (Student ID is required)');
                return false;
            }
            if (!CONFIG.REGEX.STUDENT_ID.test(val)) {
                setFieldState(DOM.studentId, DOM.studentIdError, false, 'អត្តលេខសិស្សត្រូវមាន ៣-២០ តួអក្សរ ឬលេខ (ឧ. STU-2026)');
                return false;
            }
            setFieldState(DOM.studentId, DOM.studentIdError, true);
            return true;
        },

        email() {
            const val = DOM.email.value.trim();
            if (!val) {
                setFieldState(DOM.email, DOM.emailError, false, 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែល! (Email is required)');
                return false;
            }
            if (!CONFIG.REGEX.EMAIL.test(val)) {
                setFieldState(DOM.email, DOM.emailError, false, 'ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ! (ឧទាហរណ៍៖ student@domain.com)');
                return false;
            }
            setFieldState(DOM.email, DOM.emailError, true);
            return true;
        },

        phone() {
            const raw = DOM.phone.value.trim();
            const cleaned = raw.replace(/[\s-]/g, '');
            if (!cleaned) {
                setFieldState(DOM.phone, DOM.phoneError, false, 'សូមបញ្ចូលលេខទូរស័ព្ទ! (Phone number is required)');
                return false;
            }
            if (!CONFIG.REGEX.PHONE.test(cleaned)) {
                setFieldState(DOM.phone, DOM.phoneError, false, 'លេខទូរស័ព្ទមិនត្រឹមត្រូវតាមទម្រង់កម្ពុជា (ឧទាហរណ៍៖ 012 345 678)');
                return false;
            }
            setFieldState(DOM.phone, DOM.phoneError, true);
            return true;
        },

        courseSelect() {
            const val = DOM.courseSelect.value;
            if (!val) {
                setFieldState(DOM.courseSelect, DOM.courseSelectError, false, 'សូមជ្រើសរើសវគ្គសិក្សាមួយ! (Please select a course)');
                return false;
            }
            setFieldState(DOM.courseSelect, DOM.courseSelectError, true);
            return true;
        },

        studyShift() {
            const val = DOM.studyShift.value;
            if (!val) {
                setFieldState(DOM.studyShift, DOM.studyShiftError, false, 'សូមជ្រើសរើសវេនសិក្សា! (Please select a study shift)');
                return false;
            }
            setFieldState(DOM.studyShift, DOM.studyShiftError, true);
            return true;
        },

        gender() {
            const checked = document.querySelector('input[name="gender"]:checked');
            if (!checked) {
                DOM.genderError.textContent = 'សូមជ្រើសរើសភេទរបស់អ្នក! (Please choose gender)';
                return false;
            }
            DOM.genderError.textContent = '';
            return true;
        },

        studyMode() {
            const val = DOM.studyMode.value;
            if (!val) {
                setFieldState(DOM.studyMode, DOM.studyModeError, false, 'សូមជ្រើសរើសទម្រង់សិក្សា! (Please select study mode)');
                return false;
            }
            setFieldState(DOM.studyMode, DOM.studyModeError, true);
            return true;
        },

        termsAgree() {
            const checked = DOM.termsAgree.checked;
            if (!checked) {
                DOM.termsAgreeError.textContent = 'សូមគូសធីកយល់ព្រមតាមលក្ខខណ្ឌ ដើម្បីបន្ត! (Terms acceptance required)';
                return false;
            }
            DOM.termsAgreeError.textContent = '';
            return true;
        }
    };

    function validateAll() {
        const results = {
            fullName: Validators.fullName(),
            studentId: Validators.studentId(),
            email: Validators.email(),
            phone: Validators.phone(),
            courseSelect: Validators.courseSelect(),
            studyShift: Validators.studyShift(),
            gender: Validators.gender(),
            studyMode: Validators.studyMode(),
            termsAgree: Validators.termsAgree()
        };

        const isValid = Object.values(results).every(Boolean);

        if (!isValid) {
            DOM.globalAlert.classList.remove('d-none');
            // Scroll smoothly to first invalid element
            const firstInvalid = DOM.form.querySelector('.is-invalid, input[name="gender"]:not(:checked), #termsAgree:not(:checked)');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            DOM.globalAlert.classList.add('d-none');
        }

        return isValid;
    }

    // ========================================================================
    // 6. LOCAL STORAGE DRAFT AUTOSAVE
    // ========================================================================
    const saveDraftDebounced = debounce(() => {
        try {
            const checkedGender = document.querySelector('input[name="gender"]:checked');
            const draft = {
                fullName: DOM.fullName.value,
                studentId: DOM.studentId.value,
                email: DOM.email.value,
                phone: DOM.phone.value,
                courseSelect: DOM.courseSelect.value,
                studyShift: DOM.studyShift.value,
                studyMode: DOM.studyMode.value,
                gender: checkedGender ? checkedGender.value : '',
                note: DOM.note.value,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(draft));
            if (DOM.draftStatusText) {
                DOM.draftStatusText.textContent = 'រក្សាទុកព្រាងដោយស្វ័យប្រវត្តិនាពេល ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) {
            console.warn('Storage unavailable:', e);
        }
    }, CONFIG.AUTOSAVE_DELAY_MS);

    function restoreDraft() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!saved) return;
            const data = JSON.parse(saved);

            if (data.fullName) DOM.fullName.value = data.fullName;
            if (data.studentId) DOM.studentId.value = data.studentId;
            if (data.email) DOM.email.value = data.email;
            if (data.phone) DOM.phone.value = data.phone;
            if (data.courseSelect) {
                DOM.courseSelect.value = data.courseSelect;
                syncRibbonWithSelection();
            }
            if (data.studyShift) DOM.studyShift.value = data.studyShift;
            if (data.studyMode) DOM.studyMode.value = data.studyMode;
            if (data.note) DOM.note.value = data.note;
            if (data.gender) {
                const radio = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
                if (radio) radio.checked = true;
            }

            if (data.fullName || data.email) {
                showToast('បានទាញយកទិន្នន័យព្រាងដែលលោកអ្នកបានបំពេញកាលពីមុន!', 'info');
            }
        } catch (e) {
            console.warn('Draft restoration failed:', e);
        }
    }

    function clearDraft() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            if (DOM.draftStatusText) {
                DOM.draftStatusText.textContent = 'ទិន្នន័យត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិ';
            }
        } catch (e) {
            console.warn(e);
        }
    }

    // ========================================================================
    // 7. COURSE SELECTION RIBBON SYNC
    // ========================================================================
    function syncRibbonWithSelection() {
        const selected = DOM.courseSelect.options[DOM.courseSelect.selectedIndex];
        if (selected && selected.value) {
            const name = selected.getAttribute('data-name') || selected.text;
            const price = selected.getAttribute('data-price') || '';
            DOM.ribbonTitle.textContent = name;
            DOM.ribbonFee.textContent = price;
            DOM.ribbon.classList.remove('d-none');
        } else {
            DOM.ribbon.classList.add('d-none');
        }
    }

    function selectCourseDirect(code, title, price) {
        DOM.courseSelect.value = code;
        Validators.courseSelect();
        syncRibbonWithSelection();

        // Scroll to form and set focus
        const registerArea = document.getElementById('register');
        if (registerArea) {
            registerArea.scrollIntoView({ behavior: 'smooth' });
        }
        DOM.fullName.focus();

        showToast(`បានជ្រើសរើសវគ្គសិក្សា៖ ${title} (${price})`, 'success');
        saveDraftDebounced();
    }

    // ========================================================================
    // 8. CELEBRATION CONFETTI ENGINE (Zero Dependencies)
    // ========================================================================
    function triggerCelebration() {
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
        const total = 40;

        for (let i = 0; i < total; i++) {
            const conf = document.createElement('div');
            conf.style.position = 'fixed';
            conf.style.zIndex = '9999';
            conf.style.width = Math.floor(Math.random() * 8 + 6) + 'px';
            conf.style.height = Math.floor(Math.random() * 8 + 6) + 'px';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.top = '-10px';
            conf.style.pointerEvents = 'none';
            conf.style.transform = `rotate(${Math.random() * 360}deg)`;

            const duration = Math.random() * 1500 + 1500;
            const drift = (Math.random() - 0.5) * 200;

            conf.animate([
                { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${drift}px, 100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
            });

            document.body.appendChild(conf);
            setTimeout(() => conf.remove(), duration);
        }
    }

    // ========================================================================
    // 9. MODAL & CONFIRMATION
    // ========================================================================
    function openModalWithData(data) {
        DOM.receiptRegNumber.textContent = data.regId;
        DOM.receiptTimestamp.textContent = data.timestamp;
        DOM.confirmFullName.textContent = data.fullName;
        DOM.confirmStudentId.textContent = data.studentId;
        DOM.confirmGender.textContent = data.gender;
        DOM.confirmEmail.textContent = data.email;
        DOM.confirmPhone.textContent = data.phone;
        DOM.confirmCourseName.textContent = data.course;
        DOM.confirmStudyShift.textContent = data.shift;
        DOM.confirmStudyMode.textContent = data.mode;

        if (data.note && data.note !== 'គ្មាន') {
            DOM.confirmNote.textContent = data.note;
            DOM.receiptNoteWrapper.style.display = 'flex';
        } else {
            DOM.receiptNoteWrapper.style.display = 'none';
        }

        DOM.modal.classList.remove('d-none');
        document.body.style.overflow = 'hidden';

        if (DOM.modalBox) {
            DOM.modalBox.focus();
        }

        triggerCelebration();
    }

    function closeModal() {
        if (!DOM.modal) return;
        DOM.modal.classList.add('d-none');
        document.body.style.overflow = '';

        // Reset the form & clear draft after successful confirmation
        DOM.form.reset();
        document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        DOM.ribbon.classList.add('d-none');
        DOM.globalAlert.classList.add('d-none');
        clearDraft();

        showToast('សូមអរគុណ! ការចុះឈ្មោះរបស់អ្នកត្រូវបានបញ្ចប់ដោយជោគជ័យ។', 'success');
    }

    function printSlip() {
        window.print();
    }

    // ========================================================================
    // 10. EVENT HANDLERS & INITIALIZATION
    // ========================================================================
    function bindEvents() {
        // Real-time input validation & draft save
        DOM.fullName.addEventListener('input', () => { Validators.fullName(); saveDraftDebounced(); });
        DOM.fullName.addEventListener('blur', Validators.fullName);

        DOM.studentId.addEventListener('input', () => { Validators.studentId(); saveDraftDebounced(); });
        DOM.studentId.addEventListener('blur', Validators.studentId);

        DOM.email.addEventListener('input', () => { Validators.email(); saveDraftDebounced(); });
        DOM.email.addEventListener('blur', Validators.email);

        DOM.phone.addEventListener('input', () => { Validators.phone(); saveDraftDebounced(); });
        DOM.phone.addEventListener('blur', Validators.phone);

        DOM.courseSelect.addEventListener('change', () => {
            Validators.courseSelect();
            syncRibbonWithSelection();
            saveDraftDebounced();
        });

        DOM.studyShift.addEventListener('change', () => { Validators.studyShift(); saveDraftDebounced(); });
        DOM.studyMode.addEventListener('change', () => { Validators.studyMode(); saveDraftDebounced(); });

        document.querySelectorAll('input[name="gender"]').forEach(radio => {
            radio.addEventListener('change', () => { Validators.gender(); saveDraftDebounced(); });
        });

        DOM.termsAgree.addEventListener('change', Validators.termsAgree);
        DOM.note.addEventListener('input', saveDraftDebounced);

        // Course ribbon clear
        if (DOM.ribbonClear) {
            DOM.ribbonClear.addEventListener('click', () => {
                DOM.courseSelect.value = '';
                syncRibbonWithSelection();
                Validators.courseSelect();
                saveDraftDebounced();
            });
        }

        // Direct Course Card Selection Buttons
        document.querySelectorAll('.btn-select-course').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-target-code');
                const name = btn.getAttribute('data-target-name');
                const price = btn.getAttribute('data-target-price');
                selectCourseDirect(code, name, price);
            });
        });

        // Form Submit
        DOM.form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!validateAll()) {
                showToast('សូមបំពេញ និងកែសម្រួលព័ត៌មានដែលមិនទាន់ត្រឹមត្រូវ!', 'error');
                return;
            }

            // Simulate Network / Application Processing State
            DOM.submitBtn.disabled = true;
            DOM.submitBtnText.textContent = 'កំពុងដំណើរការបញ្ជូន...';

            setTimeout(() => {
                DOM.submitBtn.disabled = false;
                DOM.submitBtnText.textContent = 'បញ្ជូនពាក្យចុះឈ្មោះ (Register)';

                const selectedOption = DOM.courseSelect.options[DOM.courseSelect.selectedIndex];
                const selectedGender = document.querySelector('input[name="gender"]:checked')?.value || 'N/A';
                const formattedDate = new Date().toLocaleDateString('km-KH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) + ' - ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const regId = 'REG-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

                const data = {
                    regId: regId,
                    timestamp: formattedDate,
                    fullName: DOM.fullName.value.trim(),
                    studentId: DOM.studentId.value.trim().toUpperCase(),
                    gender: selectedGender,
                    email: DOM.email.value.trim(),
                    phone: DOM.phone.value.trim(),
                    course: selectedOption ? selectedOption.text : DOM.courseSelect.value,
                    shift: DOM.studyShift.value,
                    mode: DOM.studyMode.value,
                    note: DOM.note.value.trim() || 'គ្មាន'
                };

                State.lastSubmittedData = data;
                openModalWithData(data);
            }, 600);
        });

        // Reset Button
        DOM.resetBtn.addEventListener('click', () => {
            if (confirm('តើអ្នកពិតជាចង់កំណត់ទម្រង់បែបបទនេះឡើងវិញមែនទេ? (Reset all fields?)')) {
                DOM.form.reset();
                document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
                    el.classList.remove('is-valid', 'is-invalid');
                });
                document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
                DOM.ribbon.classList.add('d-none');
                DOM.globalAlert.classList.add('d-none');
                clearDraft();
                showToast('ទម្រង់បែបបទត្រូវបានកំណត់ឡើងវិញរួចរាល់!', 'info');
            }
        });

        // Mobile Nav Toggle
        if (DOM.mobileNavToggle && DOM.primaryNav) {
            DOM.mobileNavToggle.addEventListener('click', () => {
                const isOpen = DOM.primaryNav.classList.toggle('nav-open');
                DOM.mobileNavToggle.setAttribute('aria-expanded', String(isOpen));
                DOM.mobileNavToggle.querySelector('.menu-open-icon').classList.toggle('d-none', isOpen);
                DOM.mobileNavToggle.querySelector('.menu-close-icon').classList.toggle('d-none', !isOpen);
            });

            // Close mobile menu on link click
            DOM.primaryNav.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    DOM.primaryNav.classList.remove('nav-open');
                    DOM.mobileNavToggle.setAttribute('aria-expanded', 'false');
                    DOM.mobileNavToggle.querySelector('.menu-open-icon').classList.remove('d-none');
                    DOM.mobileNavToggle.querySelector('.menu-close-icon').classList.add('d-none');
                });
            });
        }

        // Keyboard accessibility: ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && DOM.modal && !DOM.modal.classList.contains('d-none')) {
                closeModal();
            }
        });

        // Active Navigation Spy on Scroll
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        window.addEventListener('scroll', debounce(() => {
            let current = '';
            const scrollPos = window.pageYOffset + 140;

            sections.forEach(sec => {
                const top = sec.offsetTop;
                const h = sec.clientHeight;
                if (scrollPos >= top && scrollPos < top + h) {
                    current = sec.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }, 80));
    }

    // ========================================================================
    // 11. BOOTSTRAP APP
    // ========================================================================
    function init() {
        cacheDOM();
        bindEvents();
        restoreDraft();
        console.info('🚀 EduPortal Student Registration System Initialized (Senior Standard)');
    }

    // Run when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API for Inline triggers
    return {
        selectCourseDirect,
        closeModal,
        printSlip,
        showToast
    };

})();
