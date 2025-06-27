// utils/helpers.js

/**
 * Renders an authentication-related EJS page.
 * @param {object} res - Express response object.
 * @param {string} viewName - Name of the EJS template to render.
 * @param {object} reqQuery - req.query object (for messages).
 * @param {object} [extraData={}] - Additional data to pass to the template.
 */
exports.renderAuthPage = (res, viewName, reqQuery, extraData = {}) => {
    res.render(viewName, {
        message: reqQuery.message || null,
        messageType: reqQuery.info, // Changed to 'info' as per your original code
        ...extraData
    });
};

/**
 * Renders an EJS page with an error message.
 * @param {object} res - Express response object.
 * @param {string} view - Name of the EJS template to render.
 * @param {object} data - Data to pass to the template (excluding message/messageType).
 * @param {string} errorMessage - The error message to display.
 * @param {string} [messageType='error'] - Type of the message (e.g., 'error', 'warning').
 */
exports.renderWithError = (res, view, data, errorMessage, messageType = 'error') => {
    res.render(view, {
        ...data,
        message: errorMessage,
        messageType: messageType
    });
};