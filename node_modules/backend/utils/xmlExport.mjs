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

