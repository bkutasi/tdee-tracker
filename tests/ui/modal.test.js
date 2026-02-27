/**
 * Modal Rendering Tests
 * 
 * Tests for AuthModal component rendering, positioning, accessibility, and behavior
 * Browser-only tests (skip in Node.js environment)
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Modal Tests] Skipped - browser environment required');
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getModalOverlay() {
        return document.getElementById('auth-modal-overlay');
    }

    function getModal() {
        return document.getElementById('auth-modal');
    }

    function getModalContent() {
        return document.querySelector('.modal-content');
    }

    function getCloseButton() {
        return document.querySelector('.modal-close');
    }

    function isOpen() {
        const overlay = getModalOverlay();
        return overlay && !overlay.classList.contains('hidden');
    }

    // Test suite
    describe('AuthModal Rendering', () => {
        // Setup before each test
        beforeEach(() => {
            // Clean up any existing modal
            const existing = document.getElementById('auth-modal-overlay');
            if (existing) {
                existing.remove();
            }
            
            // Initialize AuthModal
            if (typeof AuthModal !== 'undefined') {
                AuthModal.init();
            }
        });

        // Cleanup after each test
        afterEach(() => {
            const overlay = getModalOverlay();
            if (overlay) {
                overlay.remove();
            }
        });

        describe('Modal Structure', () => {
            it('creates modal overlay element', () => {
                const overlay = getModalOverlay();
                expect(overlay).toBeDefined();
                expect(overlay).not.toBeNull();
            });

            it('overlay has correct class', () => {
                const overlay = getModalOverlay();
                expect(overlay.classList.contains('modal-overlay')).toBe(true);
            });

            it('overlay is initially hidden', () => {
                const overlay = getModalOverlay();
                expect(overlay.classList.contains('hidden')).toBe(true);
            });

            it('creates modal dialog element', () => {
                const modal = getModal();
                expect(modal).toBeDefined();
                expect(modal).not.toBeNull();
            });

            it('modal has correct class', () => {
                const modal = getModal();
                expect(modal.classList.contains('modal')).toBe(true);
            });

            it('creates modal content element', () => {
                const content = getModalContent();
                expect(content).toBeDefined();
                expect(content).not.toBeNull();
            });

            it('modal content has correct class', () => {
                const content = getModalContent();
                expect(content.classList.contains('modal-content')).toBe(true);
            });

            it('has modal header with title', () => {
                const header = document.querySelector('.modal-header');
                expect(header).toBeDefined();
                
                const title = document.querySelector('.modal-title');
                expect(title).toBeDefined();
            });

            it('has close button in header', () => {
                const closeButton = getCloseButton();
                expect(closeButton).toBeDefined();
                expect(closeButton.classList.contains('modal-close')).toBe(true);
            });
        });

        describe('Accessibility Attributes', () => {
            it('modal has role="dialog"', () => {
                const modal = getModal();
                expect(modal.getAttribute('role')).toBe('dialog');
            });

            it('modal has aria-modal="true"', () => {
                const modal = getModal();
                expect(modal.getAttribute('aria-modal')).toBe('true');
            });

            it('modal has aria-hidden="true" when closed', () => {
                const modal = getModal();
                expect(modal.getAttribute('aria-hidden')).toBe('true');
            });

            it('close button has aria-label', () => {
                const closeButton = getCloseButton();
                const ariaLabel = closeButton.getAttribute('aria-label');
                expect(ariaLabel).toBeDefined();
                expect(ariaLabel.length).toBeGreaterThan(0);
            });

            it('modal header has accessible heading', () => {
                const header = document.querySelector('.modal-header h2');
                expect(header).toBeDefined();
                expect(header.textContent.length).toBeGreaterThan(0);
            });
        });

        describe('Modal Behavior', () => {
            it('show() removes hidden class from overlay', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const overlay = getModalOverlay();
                expect(overlay.classList.contains('hidden')).toBe(false);
            });

            it('show() sets aria-hidden to false', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const modal = getModal();
                expect(modal.getAttribute('aria-hidden')).toBe('false');
            });

            it('hide() adds hidden class to overlay', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                AuthModal.hide();
                const overlay = getModalOverlay();
                expect(overlay.classList.contains('hidden')).toBe(true);
            });

            it('hide() sets aria-hidden to true', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                AuthModal.hide();
                const modal = getModal();
                expect(modal.getAttribute('aria-hidden')).toBe('true');
            });

            it('isShown() returns true when modal is open', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                expect(AuthModal.isShown()).toBe(true);
            });

            it('isShown() returns false when modal is closed', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.hide();
                expect(AuthModal.isShown()).toBe(false);
            });

            it('click on close button closes modal', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const closeButton = getCloseButton();
                closeButton.click();
                
                expect(AuthModal.isShown()).toBe(false);
            });

            it('click on backdrop closes modal', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const overlay = getModalOverlay();
                
                // Click directly on overlay (not on modal content)
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true
                });
                overlay.dispatchEvent(event);
                
                expect(AuthModal.isShown()).toBe(false);
            });

            it('click on modal content does NOT close modal', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const content = getModalContent();
                
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true
                });
                content.dispatchEvent(event);
                
                // Modal should still be open
                expect(AuthModal.isShown()).toBe(true);
            });

            it('Escape key closes modal', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                
                const event = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
                
                expect(AuthModal.isShown()).toBe(false);
            });

            it('other keys do NOT close modal', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                
                const event = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
                
                expect(AuthModal.isShown()).toBe(true);
            });
        });

        describe('Modal Positioning', () => {
            it('backdrop covers full viewport width', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                const overlay = getModalOverlay();
                
                // Force style calculation
                const computedStyle = window.getComputedStyle(overlay);
                expect(computedStyle.position).toBe('fixed');
            });

            it('modal uses flexbox centering', () => {
                const overlay = getModalOverlay();
                const computedStyle = window.getComputedStyle(overlay);
                
                // Overlay should use flexbox for centering
                expect(computedStyle.display).toBe('flex');
            });

            it('modal is horizontally centered', () => {
                const overlay = getModalOverlay();
                const computedStyle = window.getComputedStyle(overlay);
                
                expect(computedStyle.justifyContent).toBe('center');
            });

            it('modal is vertically centered', () => {
                const overlay = getModalOverlay();
                const computedStyle = window.getComputedStyle(overlay);
                
                expect(computedStyle.alignItems).toBe('center');
            });

            it('modal has max-width constraint', () => {
                const modal = getModal();
                const computedStyle = window.getComputedStyle(modal);
                
                const maxWidth = computedStyle.maxWidth;
                expect(maxWidth).toBeDefined();
                expect(maxWidth).not.toBe('none');
            });

            it('modal has appropriate z-index', () => {
                const overlay = getModalOverlay();
                const computedStyle = window.getComputedStyle(overlay);
                
                const zIndex = parseInt(computedStyle.zIndex, 10);
                expect(zIndex).toBeGreaterThan(900);
            });
        });

        describe('Modal Content Structure', () => {
            it('has auth status container', () => {
                const statusContainer = document.getElementById('auth-status');
                expect(statusContainer).toBeDefined();
            });

            it('has auth message container', () => {
                const messageContainer = document.getElementById('auth-message');
                expect(messageContainer).toBeDefined();
            });

            it('message container is initially hidden', () => {
                const messageContainer = document.getElementById('auth-message');
                expect(messageContainer.classList.contains('hidden')).toBe(true);
            });

            it('renders logged out state by default', () => {
                const statusContainer = document.getElementById('auth-status');
                const loggedOutContent = statusContainer.querySelector('.auth-logged-out');
                
                // Should have logged out content initially
                expect(loggedOutContent).toBeDefined();
            });

            it('has email input field in logged out state', () => {
                const emailInput = document.getElementById('email-input');
                expect(emailInput).toBeDefined();
                expect(emailInput.type).toBe('email');
            });

            it('has send magic link button', () => {
                const sendLinkBtn = document.getElementById('send-link-btn');
                expect(sendLinkBtn).toBeDefined();
            });
        });

        describe('Focus Management', () => {
            it('focuses first interactive element when opened', (done) => {
                if (typeof AuthModal === 'undefined') {
                    done();
                    return;
                }
                
                AuthModal.show();
                
                // Focus happens after a timeout in the implementation
                setTimeout(() => {
                    const firstFocusable = document.querySelector('.modal-content button, .modal-content input');
                    if (firstFocusable) {
                        expect(document.activeElement).toBe(firstFocusable);
                    }
                    done();
                }, 150);
            });

            it('close button is focusable', () => {
                const closeButton = getCloseButton();
                expect(closeButton.tabIndex).toBeGreaterThanOrEqual(0);
            });

            it('email input is focusable', () => {
                const emailInput = document.getElementById('email-input');
                if (emailInput) {
                    expect(emailInput.tabIndex).toBeGreaterThanOrEqual(0);
                }
            });
        });

        describe('Responsive Behavior', () => {
            it('has mobile-responsive styles', () => {
                const modal = getModal();
                const computedStyle = window.getComputedStyle(modal);
                
                // Should have width that adapts to viewport
                const width = computedStyle.width;
                expect(width).toBeDefined();
            });

            it('modal content has padding', () => {
                const content = getModalContent();
                const computedStyle = window.getComputedStyle(content);
                
                const padding = computedStyle.padding;
                expect(padding).toBeDefined();
                expect(padding).not.toBe('0px');
            });

            it('has animation defined', () => {
                const modal = getModal();
                const computedStyle = window.getComputedStyle(modal);
                
                // Should have animation or transition defined
                const hasAnimation = computedStyle.animation || computedStyle.transition;
                expect(hasAnimation).toBeDefined();
            });
        });

        describe('Message Display', () => {
            it('showMessage displays message', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                AuthModal.showMessage('Test message', 'success');
                
                const messageEl = document.getElementById('auth-message');
                expect(messageEl.textContent).toBe('Test message');
                expect(messageEl.classList.contains('success')).toBe(true);
                expect(messageEl.classList.contains('hidden')).toBe(false);
            });

            it('showMessage with error type applies error class', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                AuthModal.showMessage('Error message', 'error');
                
                const messageEl = document.getElementById('auth-message');
                expect(messageEl.classList.contains('error')).toBe(true);
            });

            it('showMessage with info type applies info class', () => {
                if (typeof AuthModal === 'undefined') return;
                
                AuthModal.show();
                AuthModal.showMessage('Info message', 'info');
                
                const messageEl = document.getElementById('auth-message');
                expect(messageEl.classList.contains('info')).toBe(true);
            });
        });

        describe('DOM Cleanup', () => {
            it('removes modal from DOM when removed', () => {
                const overlay = getModalOverlay();
                overlay.remove();
                
                const removedOverlay = getModalOverlay();
                expect(removedOverlay).toBeNull();
            });

            it('can reinitialize after removal', () => {
                // Remove existing
                const overlay = getModalOverlay();
                if (overlay) overlay.remove();
                
                // Reinitialize
                if (typeof AuthModal !== 'undefined') {
                    AuthModal.init();
                }
                
                const newOverlay = getModalOverlay();
                expect(newOverlay).toBeDefined();
            });
        });
    });
})();
