/**
 * FUTURY - Notification Manager
 * Toast/banner notifications system
 * @version 1.0.0
 */

export class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications-container');
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
    }

    /**
     * Show notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Type: 'info', 'success', 'warning', 'error'
     * @param {number} duration - Duration in ms (0 = persistent)
     */
    show(title, message, type = 'info', duration = null) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Remove oldest if too many
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.remove(oldest);
        }

        // Auto-remove after duration
        if (duration !== 0) {
            const timeout = duration || this.defaultDuration;
            setTimeout(() => this.remove(notification), timeout);
        }

        // Click to dismiss
        notification.addEventListener('click', () => this.remove(notification));

        return notification;
    }

    /**
     * Show success notification
     */
    success(title, message, duration = null) {
        return this.show(title, message, 'success', duration);
    }

    /**
     * Show warning notification
     */
    warning(title, message, duration = null) {
        return this.show(title, message, 'warning', duration);
    }

    /**
     * Show error notification
     */
    error(title, message, duration = null) {
        return this.show(title, message, 'error', duration);
    }

    /**
     * Show info notification
     */
    info(title, message, duration = null) {
        return this.show(title, message, 'info', duration);
    }

    /**
     * Remove notification
     */
    remove(notification) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach(n => this.remove(n));
    }
}
