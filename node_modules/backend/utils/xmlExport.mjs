import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Exports XML content as a downloadable file and backs it up to frontend/docs
 * @param {Object} res - Express response object
 * @param {string} xmlContent - The XML content to export
 * @param {string} filename - The filename for the download (should include .xml extension)
 * @returns {void}
 */
export function exportXML(res, xmlContent, filename) {
    // Backup XML to frontend/docs directory
    try {
        const docsDir = path.join(__dirname, '../../frontend/docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        const backupPath = path.join(docsDir, filename);
        fs.writeFileSync(backupPath, xmlContent, 'utf8');
        console.log(`XML backup saved to: ${backupPath}`);
    } catch (backupError) {
        console.error("Failed to backup XML file:", backupError);
        // Don't fail the export if backup fails
    }

    // Set response headers for XML download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send XML content
    res.send(xmlContent);
}

/**
 * Helper function to get week range for a date (Monday to Sunday)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Object|null} Object with key, startISO, endISO, and label properties, or null if invalid
 */
export function getWeekRange(dateString) {
    if (!dateString) return null;
    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    const day = date.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = day === 0 ? -6 : 1 - day; // Monday as first day
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatISODate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayNum}`;
    };
    const formatDisplayDate = (d) => {
        const dayNum = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${dayNum}/${month}/${year}`;
    };

    return {
        key: `${formatISODate(monday)}_${formatISODate(sunday)}`,
        startISO: formatISODate(monday),
        endISO: formatISODate(sunday),
        label: `${formatDisplayDate(monday)} - ${formatDisplayDate(sunday)}`
    };
}

/**
 * Escape special characters for XML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeXML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Format datetime in ISO 8601 format without milliseconds/timezone
 * @param {Date} date - Date object to format
 * @returns {string} Formatted datetime string (YYYY-MM-DDTHH:mm:ss)
 */
export function formatLocalDateTime(date) {
    if (!date || isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Generate XML content for weekly grouped data (bookings or sessions)
 * @param {Object} config - Configuration object
 * @param {Array} items - Array of items to export (bookings or sessions)
 * @param {Object} user - User object (member or trainer)
 * @param {string} config.rootElement - Root XML element name (e.g., 'booking_history', 'weekly_sessions')
 * @param {string} config.dtd - DTD definition string
 * @param {string} config.titlePrefix - Title prefix (e.g., 'Booking History', 'Sessions')
 * @param {string} config.countElement - Count element name (e.g., 'total_bookings', 'total_sessions')
 * @param {string} config.entityElement - Entity element name (e.g., 'member', 'trainer')
 * @param {string} config.itemElement - Item element name (e.g., 'booking', 'session')
 * @param {string} config.weekItemKey - Key for items in week groups (e.g., 'bookings', 'sessions')
 * @param {string} config.weekAttributeName - Week attribute name (e.g., 'period_label', 'label')
 * @param {string} config.emptyMessage - Message when no items available
 * @param {Function} config.getItemDate - Function to extract date from item: (item) => string
 * @param {Function} config.renderItem - Function to render item XML: (item) => string
 * @returns {string} Generated XML content
 */
export function generateWeeklyXML(config, items, user) {
    const {
        rootElement,
        dtd,
        titlePrefix,
        countElement,
        entityElement,
        itemElement,
        weekItemKey,
        weekAttributeName,
        emptyMessage,
        getItemDate,
        renderItem
    } = config;

    // Format exported_at timestamp in YYYY-MM-DD HH:mm:ss format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const exportedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Group items by week
    const weekGroups = new Map();
    items.forEach(item => {
        const dateString = getItemDate(item);
        if (!dateString) return;
        
        const range = getWeekRange(dateString);
        if (!range) return;
        
        if (!weekGroups.has(range.key)) {
            weekGroups.set(range.key, { range, [weekItemKey]: [] });
        }
        weekGroups.get(range.key)[weekItemKey].push(item);
    });

    // Sort week entries chronologically
    const weekEntries = Array.from(weekGroups.values()).sort((a, b) => {
        if (a.range.startISO === b.range.startISO) {
            return a.range.endISO.localeCompare(b.range.endISO);
        }
        return a.range.startISO.localeCompare(b.range.startISO);
    });

    // Calculate period start/end from first week's start and last week's end
    let periodStart = emptyMessage;
    let periodEnd = emptyMessage;
    if (weekEntries.length > 0) {
        periodStart = weekEntries[0].range.startISO;
        periodEnd = weekEntries[weekEntries.length - 1].range.endISO;
    }

    // Build XML header
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
    Copyright (c) ${new Date().getFullYear()} High Street Gym.
    All rights reserved.
-->
${dtd}
<${rootElement}>
    <header>
        <title>${titlePrefix} - ${user.firstName} ${user.lastName}</title>
        <exported_at>${exportedAt}</exported_at>
        <${countElement}>${items.length}</${countElement}>
        <period>
            <start>${periodStart}</start>
            <end>${periodEnd}</end>
        </period>
        <${entityElement}>
            <name>${user.firstName} ${user.lastName}</name>
            <email>${user.email}</email>
            <id>${user.id}</id>
        </${entityElement}>
    </header>`;

    // Add week elements with items
    if (weekEntries.length > 0) {
        weekEntries.forEach(({ range, [weekItemKey]: itemsInWeek }) => {
            xml += `
    <week start="${range.startISO}" end="${range.endISO}" ${weekAttributeName}="${range.label}">
${itemsInWeek.map(renderItem).join("")}
    </week>`;
        });
    }

    xml += `
</${rootElement}>`;

    return xml;
}
